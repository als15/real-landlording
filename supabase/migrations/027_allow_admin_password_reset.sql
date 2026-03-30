-- Allow 'admin' user_type in password_reset_tokens
ALTER TABLE password_reset_tokens
  DROP CONSTRAINT password_reset_tokens_user_type_check,
  ADD CONSTRAINT password_reset_tokens_user_type_check
    CHECK (user_type IN ('landlord', 'vendor', 'admin'));
