-- Token usage for the Muse app sessions that built this entry, copied
-- from muse.db (agent.agent_message_token_usage JOIN agent.agents).
-- Agent ids: the builder session (dc187fe4…), the fix session (fece577f…),
-- the judge-critic reviewer (64e74273…) and the code-critic reviewer
-- (adf5fddb…). Rows written to bundle-inputs/muse-usage.jsonl
-- unchanged, one JSON object per line, newest first.
SELECT u.agent_id AS agent_id, u.message_id AS message_id, u.created_at AS created_at, u.input_tokens AS input_tokens, u.output_tokens AS output_tokens, a.model AS model FROM agent.agent_message_token_usage u JOIN agent.agents a ON a.agent_id = u.agent_id WHERE u.agent_id IN ('dc187fe4-c20f-402f-8582-7d8209dae38b', 'fece577f-fcc6-4dcd-b16e-6e81dd0e5ff7', '64e74273-9237-4cc9-91ae-83fbe732e17a', 'adf5fddb-bcd4-43a1-a61c-5f5cb20d7197') ORDER BY u.created_at DESC LIMIT 500
