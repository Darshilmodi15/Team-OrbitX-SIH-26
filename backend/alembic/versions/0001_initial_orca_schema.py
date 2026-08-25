"""initial_orca_schema

Revision ID: 0001_initial_orca_schema
Revises: 
Create Date: 2026-08-25 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_initial_orca_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('mobile_number', sa.String(length=20), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('password_salt', sa.String(length=64), nullable=False),
        sa.Column('preferred_language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('role', sa.String(length=30), nullable=False, server_default='USER'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('location_permission_status', sa.String(length=20), nullable=False, server_default='prompt'),
        sa.Column('location_sharing_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
        sa.UniqueConstraint('email', name=op.f('uq_users_email')),
        sa.UniqueConstraint('mobile_number', name=op.f('uq_users_mobile_number')),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    op.create_index(op.f('ix_users_mobile_number'), 'users', ['mobile_number'], unique=False)
    op.create_index(op.f('ix_users_preferred_language'), 'users', ['preferred_language'], unique=False)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)

    # 2. user_locations
    op.create_table(
        'user_locations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('accuracy_m', sa.Float(), nullable=True),
        sa.Column('coastal_distance_km', sa.Float(), nullable=True),
        sa.Column('location_source', sa.String(length=50), nullable=False, server_default='GPS'),
        sa.Column('is_coastal', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('coastal_region', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_locations_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_user_locations')),
    )
    op.create_index(op.f('ix_user_locations_coastal_region'), 'user_locations', ['coastal_region'], unique=False)
    op.create_index(op.f('ix_user_locations_latitude'), 'user_locations', ['latitude'], unique=False)
    op.create_index(op.f('ix_user_locations_longitude'), 'user_locations', ['longitude'], unique=False)
    op.create_index(op.f('ix_user_locations_user_id'), 'user_locations', ['user_id'], unique=False)

    # 3. user_preferences
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('preferred_language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('voice_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('notifications_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('location_tracking_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_preferences_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_user_preferences')),
        sa.UniqueConstraint('user_id', name=op.f('uq_user_preferences_user_id')),
    )
    op.create_index(op.f('ix_user_preferences_user_id'), 'user_preferences', ['user_id'], unique=False)

    # 4. government_users
    op.create_table(
        'government_users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('department', sa.String(length=255), nullable=False),
        sa.Column('designation', sa.String(length=255), nullable=False),
        sa.Column('jurisdiction_region', sa.String(length=255), nullable=False, server_default='National'),
        sa.Column('badge_number', sa.String(length=100), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_government_users_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_government_users')),
        sa.UniqueConstraint('user_id', name=op.f('uq_government_users_user_id')),
    )
    op.create_index(op.f('ix_government_users_jurisdiction_region'), 'government_users', ['jurisdiction_region'], unique=False)
    op.create_index(op.f('ix_government_users_user_id'), 'government_users', ['user_id'], unique=False)

    # 5. government_alerts
    op.create_table(
        'government_alerts',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('issuing_authority', sa.String(length=255), nullable=False),
        sa.Column('state_or_national', sa.String(length=255), nullable=False, server_default='National'),
        sa.Column('publish_date', sa.String(length=20), nullable=False),
        sa.Column('effective_dates', sa.String(length=255), nullable=False, server_default='Immediate Effect'),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('full_text', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='General Fisheries Advisory'),
        sa.Column('reference_number', sa.String(length=100), nullable=False),
        sa.Column('document_url', sa.String(length=500), nullable=True),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='INFO'),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('radius_km', sa.Float(), nullable=True),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('published_by', sa.String(length=36), nullable=True),
        sa.Column('is_urgent', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['published_by'], ['users.id'], name=op.f('fk_government_alerts_published_by_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_government_alerts')),
    )
    op.create_index(op.f('ix_government_alerts_category'), 'government_alerts', ['category'], unique=False)
    op.create_index(op.f('ix_government_alerts_is_active'), 'government_alerts', ['is_active'], unique=False)
    op.create_index(op.f('ix_government_alerts_is_urgent'), 'government_alerts', ['is_urgent'], unique=False)
    op.create_index(op.f('ix_government_alerts_publish_date'), 'government_alerts', ['publish_date'], unique=False)
    op.create_index(op.f('ix_government_alerts_severity'), 'government_alerts', ['severity'], unique=False)
    op.create_index(op.f('ix_government_alerts_state_or_national'), 'government_alerts', ['state_or_national'], unique=False)

    # 6. government_documents
    op.create_table(
        'government_documents',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('department', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('file_size_kb', sa.Integer(), nullable=False, server_default='450'),
        sa.Column('publish_date', sa.String(length=20), nullable=False, server_default='2026-01-15'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('download_url', sa.String(length=500), nullable=False, server_default='#'),
        sa.Column('document_hash', sa.String(length=128), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_government_documents')),
    )
    op.create_index(op.f('ix_government_documents_category'), 'government_documents', ['category'], unique=False)
    op.create_index(op.f('ix_government_documents_department'), 'government_documents', ['department'], unique=False)

    # 7. emergency_contacts
    op.create_table(
        'emergency_contacts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('agency_name', sa.String(length=255), nullable=False),
        sa.Column('organization', sa.String(length=255), nullable=True),
        sa.Column('helpline', sa.String(length=50), nullable=False),
        sa.Column('phone_number', sa.String(length=50), nullable=True),
        sa.Column('alternate_phone', sa.String(length=50), nullable=True),
        sa.Column('radio_channel', sa.String(length=100), nullable=False, server_default='VHF Channel 16'),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('district', sa.String(length=100), nullable=True),
        sa.Column('region', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='Maritime SAR'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_emergency_contacts')),
    )
    op.create_index(op.f('ix_emergency_contacts_agency_name'), 'emergency_contacts', ['agency_name'], unique=False)
    op.create_index(op.f('ix_emergency_contacts_category'), 'emergency_contacts', ['category'], unique=False)
    op.create_index(op.f('ix_emergency_contacts_region'), 'emergency_contacts', ['region'], unique=False)
    op.create_index(op.f('ix_emergency_contacts_state'), 'emergency_contacts', ['state'], unique=False)

    # 8. marine_observations
    op.create_table(
        'marine_observations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('region_cell', sa.String(length=64), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('wave_height_m', sa.Float(), nullable=False),
        sa.Column('wave_period_s', sa.Float(), nullable=True),
        sa.Column('wave_direction_deg', sa.Float(), nullable=True),
        sa.Column('wind_speed_kmh', sa.Float(), nullable=False),
        sa.Column('wind_direction_deg', sa.Float(), nullable=True),
        sa.Column('wind_gust_kmh', sa.Float(), nullable=True),
        sa.Column('cloud_cover_percent', sa.Float(), nullable=True),
        sa.Column('visibility_km', sa.Float(), nullable=True),
        sa.Column('precipitation_mm', sa.Float(), nullable=True),
        sa.Column('sst_c', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(length=20), nullable=False, server_default='SAFE'),
        sa.Column('source', sa.String(length=100), nullable=False, server_default='INCOIS_OSF_WW3'),
        sa.Column('resolution_method', sa.String(length=100), nullable=False, server_default='exact'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_marine_observations')),
    )
    op.create_index(op.f('ix_marine_observations_latitude'), 'marine_observations', ['latitude'], unique=False)
    op.create_index(op.f('ix_marine_observations_longitude'), 'marine_observations', ['longitude'], unique=False)
    op.create_index(op.f('ix_marine_observations_region_cell'), 'marine_observations', ['region_cell'], unique=False)
    op.create_index(op.f('ix_marine_observations_risk_level'), 'marine_observations', ['risk_level'], unique=False)
    op.create_index(op.f('ix_marine_observations_source'), 'marine_observations', ['source'], unique=False)
    op.create_index(op.f('ix_marine_observations_timestamp'), 'marine_observations', ['timestamp'], unique=False)
    op.create_index('ix_marine_obs_cell_timestamp', 'marine_observations', ['region_cell', 'timestamp'], unique=False)

    # 9. pfz_zones
    op.create_table(
        'pfz_zones',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('zone_name', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('depth_m', sa.Float(), nullable=True),
        sa.Column('species_json', sa.Text(), nullable=False),
        sa.Column('valid_date', sa.String(length=20), nullable=False),
        sa.Column('distance_km', sa.Float(), nullable=True),
        sa.Column('bearing_deg', sa.Float(), nullable=True),
        sa.Column('source', sa.String(length=100), nullable=False, server_default='INCOIS_PFZ_MISSION'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_pfz_zones')),
    )
    op.create_index(op.f('ix_pfz_zones_latitude'), 'pfz_zones', ['latitude'], unique=False)
    op.create_index(op.f('ix_pfz_zones_longitude'), 'pfz_zones', ['longitude'], unique=False)
    op.create_index(op.f('ix_pfz_zones_valid_date'), 'pfz_zones', ['valid_date'], unique=False)
    op.create_index(op.f('ix_pfz_zones_zone_name'), 'pfz_zones', ['zone_name'], unique=False)

    # 10. geofences
    op.create_table(
        'geofences',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('boundary_geojson', sa.Text(), nullable=True),
        sa.Column('fence_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='CRITICAL'),
        sa.Column('threshold_nm', sa.Float(), nullable=False, server_default='5.0'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('coordinates_json', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_geofences')),
    )
    op.create_index(op.f('ix_geofences_fence_type'), 'geofences', ['fence_type'], unique=False)
    op.create_index(op.f('ix_geofences_name'), 'geofences', ['name'], unique=False)
    op.create_index(op.f('ix_geofences_severity'), 'geofences', ['severity'], unique=False)

    # 11. notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('alert_id', sa.String(length=64), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='WEATHER'),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='INFO'),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False, server_default='ORCA Safety Engine'),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('translated_title', sa.String(length=255), nullable=True),
        sa.Column('translated_message', sa.Text(), nullable=True),
        sa.Column('action_link', sa.String(length=500), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['alert_id'], ['government_alerts.id'], name=op.f('fk_notifications_alert_id_government_alerts'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_notifications_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_notifications')),
    )
    op.create_index(op.f('ix_notifications_alert_id'), 'notifications', ['alert_id'], unique=False)
    op.create_index(op.f('ix_notifications_category'), 'notifications', ['category'], unique=False)
    op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)
    op.create_index(op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False)
    op.create_index(op.f('ix_notifications_language'), 'notifications', ['language'], unique=False)
    op.create_index(op.f('ix_notifications_severity'), 'notifications', ['severity'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)

    # 12. notification_preferences
    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('sms_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('push_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('whatsapp_enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('alert_level_threshold', sa.String(length=20), nullable=False, server_default='MODERATE'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_notification_preferences_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_notification_preferences')),
        sa.UniqueConstraint('user_id', name=op.f('uq_notification_preferences_user_id')),
    )
    op.create_index(op.f('ix_notification_preferences_user_id'), 'notification_preferences', ['user_id'], unique=False)

    # 13. chat_history
    op.create_table(
        'chat_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('session_id', sa.String(length=128), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('translated_message', sa.Text(), nullable=True),
        sa.Column('intent', sa.String(length=50), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('sources_used_json', sa.Text(), nullable=True),
        sa.Column('risk_level', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_chat_history_user_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_chat_history')),
    )
    op.create_index(op.f('ix_chat_history_created_at'), 'chat_history', ['created_at'], unique=False)
    op.create_index(op.f('ix_chat_history_intent'), 'chat_history', ['intent'], unique=False)
    op.create_index(op.f('ix_chat_history_language'), 'chat_history', ['language'], unique=False)
    op.create_index(op.f('ix_chat_history_session_id'), 'chat_history', ['session_id'], unique=False)
    op.create_index(op.f('ix_chat_history_user_id'), 'chat_history', ['user_id'], unique=False)

    # 14. sos_requests
    op.create_table(
        'sos_requests',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('vessel_name', sa.String(length=255), nullable=False, server_default='Fishing Craft / Motor Vessel'),
        sa.Column('registration_no', sa.String(length=100), nullable=False, server_default='IND-VESSEL'),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('crew_count', sa.Integer(), nullable=False, server_default='4'),
        sa.Column('emergency_nature', sa.String(length=100), nullable=False, server_default='Engine Failure / Adrift at Sea'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('contact_phone', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE_BEACON_DISPATCHED'),
        sa.Column('assigned_mrcc', sa.String(length=255), nullable=False),
        sa.Column('mayday_message', sa.Text(), nullable=False),
        sa.Column('emergency_hotlines_json', sa.Text(), nullable=True),
        sa.Column('recorded_telemetry_json', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_sos_requests_user_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_sos_requests')),
    )
    op.create_index(op.f('ix_sos_requests_created_at'), 'sos_requests', ['created_at'], unique=False)
    op.create_index(op.f('ix_sos_requests_emergency_nature'), 'sos_requests', ['emergency_nature'], unique=False)
    op.create_index(op.f('ix_sos_requests_latitude'), 'sos_requests', ['latitude'], unique=False)
    op.create_index(op.f('ix_sos_requests_longitude'), 'sos_requests', ['longitude'], unique=False)
    op.create_index(op.f('ix_sos_requests_status'), 'sos_requests', ['status'], unique=False)
    op.create_index(op.f('ix_sos_requests_user_id'), 'sos_requests', ['user_id'], unique=False)

    # 15. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_audit_logs_user_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_logs')),
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_resource_type'), 'audit_logs', ['resource_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)

    # 16. system_settings
    op.create_table(
        'system_settings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_encrypted', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_system_settings')),
        sa.UniqueConstraint('key', name=op.f('uq_system_settings_key')),
    )
    op.create_index(op.f('ix_system_settings_key'), 'system_settings', ['key'], unique=False)


def downgrade() -> None:
    op.drop_table('system_settings')
    op.drop_table('audit_logs')
    op.drop_table('sos_requests')
    op.drop_table('chat_history')
    op.drop_table('notification_preferences')
    op.drop_table('notifications')
    op.drop_table('geofences')
    op.drop_table('pfz_zones')
    op.drop_table('marine_observations')
    op.drop_table('emergency_contacts')
    op.drop_table('government_documents')
    op.drop_table('government_alerts')
    op.drop_table('government_users')
    op.drop_table('user_preferences')
    op.drop_table('user_locations')
    op.drop_table('users')
