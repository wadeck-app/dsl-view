# Out of Scope — dsl-view

- Application-level routing setup — consumer wires `react-router-dom`.
- Fetcher implementation — consumer supplies `fetcher` prop to `GenericPageRunner`.
- Authentication and token validation — consumer provides `getToken`; renderer does not enforce auth.
- CSS/Tailwind build output — consumer owns the styling pipeline; `dsl-ui` ships no compiled styles.
- Token security — all token handling after `getToken` is the consumer's responsibility.
- Server-side rendering — renderer targets client-side React only.
- Backend contract definition — `pageTypesGenerator` validates against consumer-provided contracts; it does not define them.
- Domain and business components — anything whose name, props, copy, endpoint or data shape belongs to one product (invite tokens, request-log counters...) lives in the requesting project's own library. See "Scope of dsl-ui" in `guiding-principles.md`.
