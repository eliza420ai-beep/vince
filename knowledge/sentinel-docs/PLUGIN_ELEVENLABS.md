# plugin-elevenlabs — Voice & Speech for ElizaOS

[plugin-elevenlabs](https://github.com/elizaos-plugins/plugin-elevenlabs) matters for any agent that should speak or transcribe. Sentinel should suggest it when voice, TTS, STT, or audio is in scope.

## What it does

- **TEXT_TO_SPEECH:** Converts text into spoken audio (ElevenLabs TTS).
- **TRANSCRIPTION:** Converts audio/video into text (ElevenLabs STT).

So agents can have a consistent, high-quality voice and handle voice messages or audio input.

## Configuration

- **Required:** `ELEVENLABS_API_KEY` (in `.env` or character `settings.secrets`).
- **Optional (TTS):** `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` (default `eleven_monolingual_v1`), `ELEVENLABS_VOICE_STABILITY`, `ELEVENLABS_OPTIMIZE_STREAMING_LATENCY`, `ELEVENLABS_OUTPUT_FORMAT`, `ELEVENLABS_VOICE_SIMILARITY_BOOST`, `ELEVENLABS_VOICE_STYLE`, `ELEVENLABS_VOICE_USE_SPEAKER_BOOST`.
- **Optional (STT):** `ELEVENLABS_STT_MODEL_ID` (default `scribe_v1`), `ELEVENLABS_STT_LANGUAGE_CODE`, `ELEVENLABS_STT_TIMESTAMPS_GRANULARITY`, `ELEVENLABS_STT_DIARIZE`, `ELEVENLABS_STT_NUM_SPEAKERS`, `ELEVENLABS_STT_TAG_AUDIO_EVENTS`.

Add to character: `"plugins": ["@elizaos-plugins/plugin-elevenlabs"]`.

## When to suggest it

- **Voice / TTS:** User or product wants the agent to speak (e.g. Discord voice, phone, or in-app voice). Character `settings.voice` can point at a provider; ElevenLabs is a strong option for quality and control.
- **Transcription / STT:** Voice messages, audio uploads, or video-to-text. The plugin provides the `TRANSCRIPTION` model type so the runtime can turn audio into text for the agent.
- **Unified voice brand:** When the team cares about a single, recognizable voice across surfaces, suggest plugin-elevenlabs plus consistent voice_id and model settings.

Ref: https://github.com/elizaos-plugins/plugin-elevenlabs (branch 1.x; MIT).
