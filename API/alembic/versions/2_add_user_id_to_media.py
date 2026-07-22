"""Add user_id and other columns to media table

Revision ID: 2
Revises: aced7d3fcd4a
Create Date: 2024-01-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2'
down_revision: Union[str, Sequence[str], None] = 'aced7d3fcd4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add new columns to media table."""
    # Add user_id column (foreign key)
    op.add_column('media', sa.Column('user_id', sa.Integer(), nullable=False, server_default='1'))
    op.create_index(op.f('ix_media_user_id'), 'media', ['user_id'], unique=False)
    
    # Add file_path column
    op.add_column('media', sa.Column('file_path', sa.String(500), nullable=True))
    
    # Add analysis column (JSON)
    op.add_column('media', sa.Column('analysis', sa.JSON(), nullable=True))
    
    # Add created_at column
    op.add_column('media', sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True))
    
    # Drop old status column if it exists
    try:
        op.drop_column('media', 'status')
    except:
        pass


def downgrade() -> None:
    """Revert changes."""
    op.drop_index(op.f('ix_media_user_id'), table_name='media')
    op.drop_column('media', 'created_at')
    op.drop_column('media', 'analysis')
    op.drop_column('media', 'file_path')
    op.drop_column('media', 'user_id')
    op.add_column('media', sa.Column('status', sa.String(50), nullable=True))
