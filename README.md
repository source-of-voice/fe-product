# Source of Voice frontend UI update

This package contains only frontend application code/configuration. Docker, Nginx and compose files were intentionally not changed here.

Main changes:

- `Recordings` was renamed to `Tasks`.
- Endpoint labels such as `POST /...` were removed from the UI.
- The dashboard no longer displays gateway routes.
- Available tasks and my submissions are shown side by side.
- Tasks can be searched, filtered by language and sorted on the client side.
- Opening a task shows a centered modal with blurred background.
- The task modal includes the text, task metadata, live browser audio recording, timer, waveform, file upload and submit action.
- The user no longer manually enters the audio text ID; the selected task ID is used automatically.
- Buttons, icons, inputs and form spacing were adjusted.
- Light glassmorphism styling was rewritten to match the provided `index.css` direction.
- Authenticated requests now also attach `X-User-Id` from the JWT payload.

Build check used:

```bash
npm install --no-package-lock --no-audit --no-fund
npm run build
```
