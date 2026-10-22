import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Android emulator uses 10.0.2.2 to access host machine localhost.
// iOS simulator and Web can use localhost.
const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const ImageUploader = () => {
  const [photo, setPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [captions, setCaptions] = useState([]);

  // Function to open the device gallery
  const handleChoosePhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access photo library is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      setPhoto(pickerResult.assets[0]);
      setAnalysisResult(null);
      setCaptions([]);
    }
  };

  // Helper function using XMLHttpRequest for bulletproof React Native FormData uploads
  const uploadWithXHR = (url, formData) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Server returned HTTP ${xhr.status}: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error(`Network request failed. Could not reach ${url}`));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload request timed out.'));
      };

      xhr.send(formData);
    });
  };

  // Function to handle upload & fetch analysis + lyrics
  const handleUploadPhoto = async () => {
    if (!photo) {
      Alert.alert('No Image', 'Please select an image first.');
      return;
    }

    setIsUploading(true);

    try {
      const filename = photo.fileName || photo.uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = photo.mimeType || (match ? `image/${match[1]}` : 'image/jpeg');

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        name: filename,
        type: mimeType,
      });

      const endpoint = `${API_BASE_URL}/upload/image?user_id=1&title=${encodeURIComponent(filename)}`;

      const data = await uploadWithXHR(endpoint, formData);

      if (data) {
        if (data.analysis) {
          setAnalysisResult(data.analysis);
        }
        if (data.captions && data.captions.length > 0) {
          setCaptions(data.captions);
        } else if (data.analysis && data.analysis.captions) {
          setCaptions(data.analysis.captions);
        }
        Alert.alert('Success', 'Image analyzed & Spotify lyrics matched!');
      } else {
        Alert.alert('Notice', 'Image uploaded, but no data was returned.');
      }
    } catch (error) {
      console.error('Upload Error: ', error);
      Alert.alert(
        'Upload Failed',
        `${error.message}\n\nEndpoint: ${API_BASE_URL}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenSpotify = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Spotify Link', `Listen to song at: ${url}`);
      }
    } catch (e) {
      Alert.alert('Spotify Link', url);
    }
  };

  const handleCopyCaption = (captionText) => {
    Alert.alert('Selected Caption', `${captionText}\n\nReady to paste into your social post!`);
  };

  const handleReset = () => {
    setPhoto(null);
    setAnalysisResult(null);
    setCaptions([]);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>🎵 AI Lyric Caption Generator</Text>
        <Text style={styles.subtitle}>Upload any photo to match aesthetic song lyrics & Spotify tracks</Text>

        {/* Display selected image or placeholder */}
        {photo ? (
          <Image
            source={{ uri: photo.uri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
        ) : (
          <TouchableOpacity style={styles.placeholder} onPress={handleChoosePhoto}>
            <Text style={styles.placeholderIcon}>📸</Text>
            <Text style={styles.placeholderText}>Tap to choose a photo</Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.browseButton]}
            onPress={handleChoosePhoto}
            disabled={isUploading}
          >
            <Text style={styles.buttonText}>{photo ? 'Change Photo' : 'Browse Picture'}</Text>
          </TouchableOpacity>

          {photo && !analysisResult && (
            <TouchableOpacity
              style={[styles.button, styles.uploadButton, isUploading && styles.disabledButton]}
              onPress={handleUploadPhoto}
              disabled={isUploading}
            >
              {isUploading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.buttonText, { marginLeft: 8 }]}>Matching Lyrics...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Find Lyric Captions</Text>
              )}
            </TouchableOpacity>
          )}

          {analysisResult && (
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}
            >
              <Text style={styles.buttonText}>Upload Another Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Matched Lyric Captions Section */}
        {captions && captions.length > 0 && (
          <View style={styles.lyricsContainer}>
            <Text style={styles.sectionHeading}>🎶 Matched Lyric Captions</Text>
            <Text style={styles.sectionSubheading}>Ranked by mood & aesthetic relevance</Text>

            {captions.map((item, idx) => (
              <View key={`cap-${idx}`} style={styles.lyricCard}>
                <View style={styles.lyricCardHeader}>
                  <View style={styles.genreBadge}>
                    <Text style={styles.genreText}>{item.genre || 'Song'}</Text>
                  </View>
                  <View style={styles.matchScoreBadge}>
                    <Text style={styles.matchScoreText}>{item.match_score}% Match</Text>
                  </View>
                </View>

                {/* The Quotable Caption */}
                <Text style={styles.lyricQuote}>{item.caption}</Text>

                {/* Song & Artist Info */}
                <View style={styles.songInfoRow}>
                  <Text style={styles.songTitle}>🎵 {item.track_name}</Text>
                  <Text style={styles.artistName}>by {item.track_artist}</Text>
                </View>

                {/* Action Buttons: Copy & Spotify */}
                <View style={styles.lyricActions}>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => handleCopyCaption(item.caption)}
                  >
                    <Text style={styles.copyBtnText}>📋 Copy Caption</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.spotifyBtn}
                    onPress={() => handleOpenSpotify(item.spotify_url)}
                  >
                    <Text style={styles.spotifyBtnText}>🟢 Spotify</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Image Features / Aesthetic Breakdown */}
        {analysisResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.sectionHeading}>✨ Image Mood & Scene Vibe</Text>

            <View style={styles.infoGrid}>
              {analysisResult.scene ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Scene</Text>
                  <Text style={styles.infoValue}>{analysisResult.scene}</Text>
                </View>
              ) : null}

              {analysisResult.mood ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Mood</Text>
                  <Text style={styles.infoValue}>{analysisResult.mood}</Text>
                </View>
              ) : null}

              {analysisResult.occasion ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Occasion</Text>
                  <Text style={styles.infoValue}>{analysisResult.occasion}</Text>
                </View>
              ) : null}

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>People Count</Text>
                <Text style={styles.infoValue}>{analysisResult.people_count ?? 0}</Text>
              </View>
            </View>

            {/* Objects & Colors */}
            {analysisResult.objects && analysisResult.objects.length > 0 && (
              <View style={styles.tagSection}>
                <Text style={styles.tagSectionLabel}>Detected Aesthetic Elements</Text>
                <View style={styles.tagsContainer}>
                  {analysisResult.objects.map((item, index) => (
                    <View key={`obj-${index}`} style={styles.tagBadge}>
                      <Text style={styles.tagText}>🏷️ {item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {analysisResult.colors && analysisResult.colors.length > 0 && (
              <View style={styles.tagSection}>
                <Text style={styles.tagSectionLabel}>Color Palette</Text>
                <View style={styles.tagsContainer}>
                  {analysisResult.colors.map((color, index) => (
                    <View key={`color-${index}`} style={styles.colorBadge}>
                      <Text style={styles.colorTagText}>🎨 {color}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    width: 270,
    height: 270,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#eaeaea',
  },
  placeholder: {
    width: 270,
    height: 190,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  placeholderIcon: {
    fontSize: 42,
    marginBottom: 8,
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    width: '100%',
    gap: 10,
    marginBottom: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  browseButton: {
    backgroundColor: '#3b82f6',
  },
  uploadButton: {
    backgroundColor: '#10b981',
  },
  resetButton: {
    backgroundColor: '#475569',
  },
  disabledButton: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  lyricsContainer: {
    width: '100%',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  sectionSubheading: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  lyricCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  lyricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  genreBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genreText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  matchScoreBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchScoreText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '700',
  },
  lyricQuote: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    fontWeight: '500',
    color: '#f8fafc',
    marginBottom: 12,
  },
  songInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
  artistName: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  lyricActions: {
    flexDirection: 'row',
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  spotifyBtn: {
    flex: 1,
    backgroundColor: '#1db954',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  spotifyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  resultContainer: {
    width: '100%',
    marginTop: 14,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  tagSection: {
    marginTop: 10,
  },
  tagSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  tagText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '500',
  },
  colorBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  colorTagText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ImageUploader;
