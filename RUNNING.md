# Run locally

Requires Node 22 or newer and no installed packages. Export REBRANDLY_API_KEY, run `node server.cjs`, and open http://127.0.0.1:3002. Choose either Bytesize page to shorten URLs. Wordsmith still uses its public Datamuse API.

Validation: `node --test tests/*.test.cjs`.

Set the server environment variable in your shell, for example `export REBRANDLY_API_KEY="your-new-key"`. The .env.example file is documentation; the server does not auto-load .env files. Do not put this key in a REACT_APP_ variable or browser code.

Previously committed credentials remain in Git history and must be revoked or rotated in the provider account. Removing them from current source does not revoke them. Real provider credentials were not exercised in regression tests. The server binds to 127.0.0.1 for local use; add authentication and operational limits before any public deployment.
