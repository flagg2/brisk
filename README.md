# Brisk

A [library](https://www.npmjs.com/package/@flagg2/brisk) built on top of express, which allows for easier development of apis

## Features
- Typesafely handle req.body and req.query with zod
- Typesafely handle responses and status codes
- Handle auth tokens (with either jwt or custom auth method) and provide typesafe user context for each route
- Make express routing more sensible and predictable
- Allow for easier file uploads
- Allow filtering duplicate requests to avoid race conditions
- Handle logging
