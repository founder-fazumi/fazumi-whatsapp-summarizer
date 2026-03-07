# ZIP Summarize

FAZUMI supports authenticated ZIP uploads for WhatsApp-style text exports without storing raw chat text in the summaries database.

## Supported inputs

- A `.zip` archive that contains one or more `.txt` files.
- WhatsApp-style text lines in these formats:
  - `MM/DD/YY, HH:MM AM - Name: Message`
  - `[DD/MM/YYYY, HH:MM] Name: Message`
- Multi-line messages are supported when continuation lines do not start with a new timestamp.
- Media files inside the archive are ignored.

## How incremental processing works

1. The client sends a ZIP file, a time window (`24h` or `7d`), a stable group name, and a language preference.
2. The server extracts `.txt` files in memory, parses messages, normalizes sender/body text, and computes a SHA-256 fingerprint from:
   - `group_key`
   - timestamp
   - normalized sender
   - normalized message body
3. FAZUMI checks those fingerprints against the same user + group.
4. Only unseen messages inside the selected time window are sent to the summarizer.
5. After a successful summary, only the processed fingerprints are stored.

This means:

- Uploading the same ZIP twice returns `no_new_messages`.
- Uploading a newer ZIP from the same group processes only the unseen portion.
- Messages outside the selected window are not marked as processed yet.

## De-duplication of tasks and events

- The ZIP summarizer asks the model for structured facts with deterministic `dedupe_key` values.
- FAZUMI stores emitted dedupe keys in `group_state`.
- On later uploads from the same group, repeated tasks/events/deadlines are filtered out before the summary is saved.

## Privacy note

- Raw chat text is processed in-memory for the request and sent to OpenAI during summarization.
- Raw chat text is not stored in `summaries`, `chat_groups`, `processed_message_fingerprints`, or `group_state`.
- Incremental state stores only:
  - group metadata
  - message fingerprints
  - structured dedupe keys already emitted
