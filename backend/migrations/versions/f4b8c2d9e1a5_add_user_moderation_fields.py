"""add user moderation fields (is_active, can_ssh, max_connections, last_login_at)

Revision ID: f4b8c2d9e1a5
Revises: c3f8a5d7e1b0
Create Date: 2026-09-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4b8c2d9e1a5'
down_revision = 'c3f8a5d7e1b0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.alter_column('users', 'is_active', server_default=None)
    op.add_column('users', sa.Column('can_ssh', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.alter_column('users', 'can_ssh', server_default=None)
    op.add_column('users', sa.Column('max_connections', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'max_connections')
    op.drop_column('users', 'can_ssh')
    op.drop_column('users', 'is_active')
