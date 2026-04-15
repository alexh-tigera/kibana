# @kbn/ml-common-api-schemas

Server-side schemas for ML APIs and embeddables.

This package is a `shared-server` package. Server code may import its schema values and schema-derived types. Common and browser code may only consume its exported types via `import type { ... } from '@kbn/ml-common-api-schemas/...';`.

Any browser-safe runtime values should live in a `shared-common` package such as `@kbn/ml-common-types`.

The package name is historical: despite the `common` name, the package itself is server-only at runtime.
