# Creator Doodle Upload Design

## Goal

Make image uploads use the Creator upload API while preserving the JSON and binary artifacts required by `uploadDoodle`.

## Design

- `uploadsImage` accepts a `Blob` or `File` plus a filename and creates `multipart/form-data` with the backend-required `file` field.
- Axios determines the multipart boundary; callers do not set `Content-Type` manually.
- The API response is typed using the Creator image upload contract.
- `uploadFile` sends `image/*` values to the Creator image API and adapts `{ url, size }` to the existing `{ fileUrl, fileSize }` contract.
- Non-image binary values retain the existing OSS upload path because the Creator image endpoint rejects them.
- JSON values use the Creator JSON endpoint and the same `FileResponse` adapter.
- `uploadDoodle` returns its JSON URL, binary URL, sizes, and generated PNG cover URL.

## Error Handling

Existing Axios interceptors propagate authentication, validation, size, and network failures. `uploadDoodle` propagates those failures to its caller.

## Verification

- Verify the API helper appends a file under the `file` multipart field.
- Verify TypeScript/build succeeds and no `debugger` or temporary fixed return remains in the modified path.
