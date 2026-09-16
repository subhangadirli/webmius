"""add connection_shares table for user-to-user sharing

Revision ID: a1c3e5f7b9d2
Revises: f4b8c2d9e1a5
Create Date: 2026-09-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1c3e5f7b9d2'
down_revision = 'f4b8c2d9e1a5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'connection_shares',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('connection_id', sa.Integer(), nullable=False),
        sa.Column('shared_with_user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['connection_id'], ['ssh_connections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_with_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('connection_id', 'shared_with_user_id', name='uq_share_connection_user'),
    )


def downgrade():
    op.drop_table('connection_shares')
