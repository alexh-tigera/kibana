---
navigation_title: "Salesforce"
type: reference
description: "Use the Salesforce connector to run SOQL and SOSL queries, fetch records, describe sobject metadata, and download files from your Salesforce org."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Salesforce connector [salesforce-action-type]

The Salesforce connector communicates with the Salesforce REST API to query and retrieve data from your Salesforce org. It supports SOQL queries, SOSL full-text search, fetching records by ID, listing records for standard and custom objects, retrieving sobject metadata (describe), and downloading file content from ContentVersion records.

## Create connectors in {{kib}} [define-salesforce-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [salesforce-connector-configuration]

The Salesforce connector supports **OAuth 2.0 Client Credentials** and **OAuth 2.0 authorization code** authentication in
{{kib}}. The fields you enter depend on which authentication type you select.

**Token URL**
:   The OAuth 2.0 token endpoint for your Salesforce instance. Use your **domain** plus `/services/oauth2/token`.
    Examples: `https://login.salesforce.com/services/oauth2/token` (production),
    `https://test.salesforce.com/services/oauth2/token` (sandbox), or
    `https://yourcompany.my.salesforce.com/services/oauth2/token` (My Domain).

**Authorization URL**
:   Required when you use **OAuth 2.0 authorization code** authentication. Use the same **domain** as for **Token URL**, with
    `/services/oauth2/authorize`. Examples: `https://login.salesforce.com/services/oauth2/authorize` (production),
    `https://test.salesforce.com/services/oauth2/authorize` (sandbox), or
    `https://yourcompany.my.salesforce.com/services/oauth2/authorize` (My Domain). Omit this when you use client
    credentials only.

**Client ID**
:   The **Consumer Key** from your Salesforce External Client App OAuth settings. Refer to [Get API credentials](#salesforce-api-credentials).

**Client Secret**
:   The **Consumer Secret** from your Salesforce External Client App OAuth settings.

The connector uses the token URL to obtain access tokens and to derive the instance base URL for API calls. The
connector uses the authorization URL only for the browser-based authorization step in the authorization code flow. The
connector automatically configures the required OAuth scopes (`api` and `refresh_token`).

## Test connectors [salesforce-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by running a simple SOQL query (`SELECT Id FROM User LIMIT 1`).

The Salesforce connector has the following actions:

Query
:   Run a SOQL query against Salesforce. Returns query results; for large result sets, the response may include `nextRecordsUrl` for pagination.
    - `soql` (required): A valid SOQL query string (for example, `SELECT Id, Name FROM Account LIMIT 10`).
    - `nextRecordsUrl` (optional): URL from a previous response to fetch the next page of results.

Search
:   Run a SOSL full-text search across one or more sobjects. Only searches objects you list in `returning`; custom objects must have **Allow Search** selected. Results are capped at approximately 2,000. Use the **describe** action or list objects first to discover valid object names.
    - `searchTerm` (required): Text to search for (for example, `Acme Corp` or `Q4 renewal`).
    - `returning` (required): Comma-separated sobject API names to search (for example, `Account,Contact,Opportunity`).
    - `nextRecordsUrl` (optional): URL from a previous response to fetch the next page of search results.

Get record
:   Retrieve a single record by object type and record ID.
    - `sobjectName` (required): The API name of the sobject (for example, `Account`, `Contact`, `Lead`).
    - `recordId` (required): The 18-character record ID.

List records
:   List records for a Salesforce sobject. Returns a page of record IDs; use `nextRecordsUrl` from the response to fetch the next page.
    - `sobjectName` (required): The API name of the sobject (for example, `Account`, `Contact`).
    - `limit` (optional): Maximum number of records to return. Default is 50; maximum is 2,000.
    - `nextRecordsUrl` (optional): URL from a previous response to fetch the next page of results.

Describe
:   Get metadata for an sobject (fields, layout, and other describe information). Use this to discover field names and types before building SOQL queries or mapping data.
    - `sobjectName` (required): The API name of the sobject (for example, `Account`, `Contact`, `MyObject__c`).

Download file
:   Download file content from a ContentVersion record. Returns the file as base64 and the content-type header when present.
    - `contentVersionId` (required): The ContentVersion record ID (from a SOQL query or related record).

## Connector networking configuration [salesforce-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking,
such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use
`xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [salesforce-api-credentials]

Both authentication types use credentials from a Salesforce **External Client App**. The following steps create the
app and retrieve the values you need for the connector in {{kib}}. These steps might change as the Salesforce UI updates.

### Create an External Client App in Salesforce [salesforce-create-external-client-app]

1. Log in to the Salesforce org you use for this integration (for example, production, a sandbox, or another hosted
   instance).
2. Select the **Setup** gear icon.
3. In the left navigation, under **Platform Tools**, expand **Apps** > **External Client Apps**.
4. Select **External Client App Manager**, then select **New External Client App**.
5. Set an **External Client App Name** (the label in the list; for example, `Elastic`) and an **API Name**
   (for example, `Elastic`). Complete any other required fields.
6. Under **OAuth Settings**, set **Callback URL** to the {{kib}} OAuth callback URL for your host. Copy the following
   pattern, replacing `<your-kibana-host>` with your {{kib}} public hostname (no trailing slash before the path):

    ```text
    https://<your-kibana-host>/api/actions/connector/_oauth_callback
    ```

    For **OAuth 2.0 Client Credentials**, Salesforce requires a callback URL, but the connector does not use it for
    browser redirects. For **OAuth 2.0 authorization code**, this URL must match the redirect URL that {{kib}} uses.
7. Under **Available Scopes**, select at least:
    - **Manage user data via APIs (api)**
    - **Perform requests at any time (refresh_token, offline_access)**
8. Under **Flow Enablement**, enable the option that matches the authentication type you choose for the connector in
   {{kib}}:
    - **OAuth 2.0 Client Credentials** — select **Enable Client Credentials Flow**.
    - **OAuth 2.0 authorization code** — select **Enable Authorization Code and Credentials Flow** (or the equivalent
      label for the authorization-code flow in your Salesforce release).
    - To use both authentication types with the same External Client App, enable both options.
9. Under **Security**, select the following options (labels can vary slightly by release):
    - **Require secret for Web Server Flow**
    - **Request secret for Refresh Token Flow** (or **Require Secret for Refresh Token Flow**)
    - **Require Proof Key for Code Exchange (PKCE) extension for Supported Authorization Flows** when your org requires
      PKCE.
10. Select **Save**.

### Configure policies (client credentials only) [salesforce-configure-policies]

If you use **OAuth 2.0 Client Credentials**, configure the app’s execution policy:

1. Open the app and select **Manage** > **Edit Policies** (or the equivalent in your Salesforce release).
2. Set **Permitted Users** as your org requires (often **Admin approved users are pre-authorized**).
3. Set **Run As** to the Salesforce user that owns API access for this integration. Use a dedicated integration user
   with least-privilege permission sets.

Refer to Salesforce Help for current policy and **Run As** requirements for the client credentials flow in your org.

### Retrieve credentials and configure the connector [salesforce-retrieve-credentials]

1. Open the app, scroll to **OAuth Settings**, and select **Consumer Key and Secret**.
2. Copy the **Consumer Key** and enter it as **Client ID** in the connector configuration in {{kib}}.
3. Copy the **Consumer Secret** and enter it as **Client Secret** in the connector configuration in {{kib}}.
4. For **Token URL**, enter your org’s OAuth token endpoint (**domain** + `/services/oauth2/token`):
    - Production: `https://login.salesforce.com/services/oauth2/token`
    - Sandbox: `https://test.salesforce.com/services/oauth2/token`
    - My Domain: `https://yourcompany.my.salesforce.com/services/oauth2/token`
5. If you use **OAuth 2.0 authorization code** authentication, also enter the **Authorization URL** using the
   same domain as the token URL with `/services/oauth2/authorize`:
    - Production: `https://login.salesforce.com/services/oauth2/authorize`
    - Sandbox: `https://test.salesforce.com/services/oauth2/authorize`
    - My Domain: `https://yourcompany.my.salesforce.com/services/oauth2/authorize`

    Skip this step when you use **OAuth 2.0 Client Credentials** only.
6. If you use **OAuth 2.0 authorization code** authentication, select **Authorize** in {{kib}} to complete the
   browser-based authorization flow. {{kib}} exchanges the authorization code for access and refresh tokens
   automatically.

:::{tip}
The connector automatically configures the required OAuth scopes (`api` and `refresh_token`). You do not need to
enter scopes manually in {{kib}}.
:::

For more background, search Salesforce Help for **External Client Apps** and the **OAuth 2.0 client credentials flow**.
