# Plan: Move workflow validation tests to kbn-connector-specs

## Goal

Move connector workflow **validation tests** to live next to the workflow YAML files in `kbn-connector-specs`. Move connector workflow **execution tests** to `workflows_execution_engine` where `WorkflowRunFixture` already lives.

## Problem

`kbn-connector-specs` is a `shared-common` package — it cannot depend on plugins. The test helpers currently depend on 3 plugins:
- `@kbn/workflows-management-plugin` — for `validateWorkflowYaml` and `WORKFLOW_ZOD_SCHEMA`
- `@kbn/workflows-execution-engine` — for `WorkflowRunFixture`
- `@kbn/workflows-extensions` — for `ServerStepRegistry`, `registerInternalStepDefinitions`, `APPROVED_STEP_DEFINITIONS`

## Step 1: Validate transitive deps (DONE)

Checked whether `validateWorkflowYaml` and `WORKFLOW_ZOD_SCHEMA` can move to `@kbn/workflows`.

**`@kbn/i18n` is a `shared-common` package** — no blocker.

**Clean — can move to `@kbn/workflows` as-is:**
- `validateStepNameUniqueness` — only uses `@kbn/workflows` types
- `validateLiquidTemplate` + `extractLiquidErrorPosition` — only uses `liquidjs`, `yaml` (npm), `@kbn/workflows`
- Error classes (`InvalidYamlSchemaError`, `InvalidYamlSyntaxError`, etc.) — only `@kbn/zod`
- `regex.ts` — no imports
- `yaml/validate_yaml_document.ts` — only `yaml` npm + local errors
- `yaml/parse_workflow_yaml_to_json_without_validation.ts` — only `yaml` npm
- `staticConnectors` — uses `@kbn/i18n`, `@kbn/workflows`, `@kbn/zod` (all packages)
- `WORKFLOW_ZOD_SCHEMA` = `generateYamlSchemaFromConnectors(staticConnectors)` — both already in or movable to `@kbn/workflows`

**Two plugin deps — resolved via dependency injection:**
- `format_zod_error.ts` calls `getAllConnectors()` — refactor to accept an optional `getConnectors` callback. When not provided, connector-dependent error enhancement gracefully falls back to generic messages.
- `validate_triggers.ts` imports trigger types from `@kbn/workflows-extensions/common` — refactor to accept `triggerDefinitions` as an optional parameter (already partially the case — `validateWorkflowYaml` only calls it when `options.triggerDefinitions` is provided). Make the import lazy/optional.

## Step 2: Refactor plugin deps to use dependency injection

**`format_zod_error.ts`:**
- Change `formatZodError` signature to accept an optional `getConnectors` callback:
  ```typescript
  export function formatZodError(
    error: ZodError | MockZodError,
    schema?: z.ZodType,
    yamlDocument?: Document,
    options?: { getConnectors?: () => ConnectorContractUnion[] }
  ): FormatZodErrorResult
  ```
- Internal functions that call `getAllConnectors()` (`getConnectorParamsSchema`, `getBetterFieldErrorMessage`, `getConnectorUnionSchemaFromPath`) use `options?.getConnectors?.()` instead, returning `null`/falling through to generic messages when not provided.
- Remove the static `import { getAllConnectors } from '../../schema'`.

**`validate_triggers.ts`:**
- The `TriggerDefinitionForValidateTriggers` type and `validateTriggers` function import from `@kbn/workflows-extensions/common`. Since `validateTriggers` is only called when `options.triggerDefinitions` is passed to `validateWorkflowYaml`, we can:
  - Move the type definition to `@kbn/workflows` (it's just an interface)
  - Keep `validateTriggers` itself — its `@kbn/workflows-extensions/common` imports need checking, but if they're just types, use `import type` which doesn't create a runtime dep

**`parseWorkflowYamlToJSON`:**
- Thread the `getConnectors` option through to `formatZodError`. No structural changes needed — just pass the option along.

## Step 3: Move validation utilities into `@kbn/workflows`

Move these from `workflows_management/common/lib/` into `@kbn/workflows`:

- `validateWorkflowYaml` function
- `validateStepNameUniqueness`
- `validateLiquidTemplate` + `extractLiquidErrorPosition`
- `parseWorkflowYamlToJSON` (with DI refactor from Step 2)
- `formatZodError` (with DI refactor from Step 2)
- `zod_type_description.ts`, `get_zod_type_name.ts`
- Error classes
- `regex.ts`
- YAML helpers (`validate_yaml_document.ts`, `parse_workflow_yaml_to_json_without_validation.ts`)
- `staticConnectors` array
- `WORKFLOW_ZOD_SCHEMA` = `generateYamlSchemaFromConnectors(staticConnectors)`

Export `validateWorkflowYaml` and `WORKFLOW_ZOD_SCHEMA` from `@kbn/workflows` public API.

**New deps for `@kbn/workflows`:**
- `@kbn/i18n` (for `staticConnectors` descriptions)
- `liquidjs` (for liquid template validation)

**Update `@kbn/workflows-management-plugin`:**
- Import `validateWorkflowYaml`, `WORKFLOW_ZOD_SCHEMA`, etc. from `@kbn/workflows`
- When calling `validateWorkflowYaml`, pass `{ getConnectors: getAllConnectors }` to get enhanced error messages
- Remove local copies of moved files (or keep as re-exports for transition)

## Step 4: Add `@kbn/workflows` as a dep of `kbn-connector-specs`

Add `@kbn/workflows` to `kbn-connector-specs` tsconfig `kbn_references`. Package-to-package — no circular dep issues.

## Step 5: Create Tier 1 validation tests in `kbn-connector-specs`

For each connector spec with `agentBuilderWorkflows`, add a test file alongside the spec (e.g., `specs/github/github_workflows.test.ts`).

Each test:
1. Loads workflows via `getWorkflowTemplatesForConnector(connectorTypeId)`
2. Renders templates with Mustache (same `<%=` delimiters as production path)
3. Validates rendered YAML with `validateWorkflowYaml(rendered, WORKFLOW_ZOD_SCHEMA)` from `@kbn/workflows`
4. Asserts: `valid === true`, no liquid template errors, correct workflow name structure

This replaces the `it('all workflows pass production validation without liquid template errors')` assertion from every current test file.

## Step 6: Move Tier 2 execution tests to `workflows_execution_engine`

Move the execution tests (that use `WorkflowRunFixture` to run workflows with mocked connectors) from `data_sources/server/sources/` to `workflows_execution_engine/integration_tests/connector_workflows/`.

- `WorkflowRunFixture` already lives in `workflows_execution_engine`
- The engine plugin can freely depend on `@kbn/connector-specs` (a package)
- Move test helpers (`registerExtensionSteps`, `getWorkflowYaml`, `loadWorkflowsFromConnectorSpec`) there too

Add `@kbn/connector-specs` to `workflows_execution_engine` tsconfig.

## Step 7: Clean up `data_sources`

- Remove all workflow test files from `data_sources/server/sources/*/`
- Remove `workflow.test_helpers.ts` from `data_sources`
- Remove now-unused deps from tsconfig

---

## Dependency graph (after changes)

```
@kbn/workflows (package, shared-common) — UPDATED
  ├── Has: generateYamlSchemaFromConnectors (already here)
  ├── Has: validateWorkflowYaml (MOVED, with optional DI for getConnectors)
  ├── Has: WORKFLOW_ZOD_SCHEMA (NEW — built from staticConnectors)
  ├── Has: staticConnectors (MOVED from workflows_management)
  ├── Has: parseWorkflowYamlToJSON (MOVED, formatZodError uses DI)
  ├── Has: formatZodError (MOVED, getAllConnectors replaced with optional callback)
  ├── Has: validateStepNameUniqueness, validateLiquidTemplate (MOVED)
  └── Has: error classes, regex, YAML helpers, zod helpers (MOVED)

@kbn/connector-specs (package, shared-common) — UPDATED
  ├── Has: workflow YAML files + agentBuilderWorkflows arrays
  ├── Has: Tier 1 validation tests (NEW)
  └── Depends on: @kbn/workflows (NEW dep, package-to-package)

@kbn/workflows-execution-engine (plugin) — UPDATED
  ├── Has: WorkflowRunFixture (stays here)
  ├── Has: Tier 2 execution tests (MOVED from data_sources)
  ├── Has: test helpers (registerExtensionSteps, loadWorkflowsFromConnectorSpec, etc.)
  └── Depends on: @kbn/connector-specs (NEW dep)

@kbn/workflows-management-plugin (plugin) — UPDATED
  ├── Imports validateWorkflowYaml etc. from @kbn/workflows (instead of local)
  ├── Calls validateWorkflowYaml with { getConnectors: getAllConnectors } for enhanced errors
  └── Keeps: validate_triggers.ts if it has non-type plugin deps

@kbn/workflows-extensions (plugin) — UNCHANGED
```

## PR sequence

1. **PR A**: Refactor DI + move validation utilities to `@kbn/workflows`. Update `workflows_management` to import from `@kbn/workflows`. Add Tier 1 tests to `kbn-connector-specs`.
2. **PR B**: Move Tier 2 execution tests from `data_sources` to `workflows_execution_engine`.
3. **PR C**: Clean up `data_sources` — remove workflow test files and helpers.
