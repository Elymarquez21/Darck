"""Create the isolated PostgreSQL payments table.

Revision ID: 20260928_0001
Revises:
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260928_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    provider = postgresql.ENUM(
        "WOMPI", "MERCADO_PAGO", "EPAYCO", "PAYU", "STRIPE", name="payment_provider", create_type=False
    )
    status = postgresql.ENUM(
        "PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR", "EXPIRED", name="payment_status", create_type=False
    )
    bind = op.get_bind()
    provider.create(bind, checkfirst=True)
    status.create(bind, checkfirst=True)
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("reference", sa.String(80), nullable=False),
        sa.Column("idempotency_key", sa.String(128)),
        sa.Column("request_fingerprint", sa.String(64)),
        sa.Column("provider", provider, nullable=False),
        sa.Column("provider_transaction_id", sa.String(128)),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", status, nullable=False),
        sa.Column("payment_method", sa.String(80)),
        sa.Column("customer_email", sa.String(254), nullable=False),
        sa.Column("customer_name", sa.String(160), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("redirect_url", sa.String(2048)),
        sa.Column("checkout_url", sa.String(2048)),
        sa.Column("raw_response", sa.JSON()),
        sa.Column("webhook_payload", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payments_reference", "payments", ["reference"], unique=True)
    op.create_index("ix_payments_idempotency_key", "payments", ["idempotency_key"], unique=True)
    op.create_index("ix_payments_provider_transaction_id", "payments", ["provider_transaction_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_created_at", "payments", ["created_at"])
    op.create_table(
        "payment_webhook_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("event_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("provider", provider, nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("provider_transaction_id", sa.String(128)),
        sa.Column("reference", sa.String(80)),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_payment_webhook_events_payment_id", "payment_webhook_events", ["payment_id"])


def downgrade():
    op.drop_table("payment_webhook_events")
    op.drop_table("payments")
    postgresql.ENUM(name="payment_status").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="payment_provider").drop(op.get_bind(), checkfirst=True)
