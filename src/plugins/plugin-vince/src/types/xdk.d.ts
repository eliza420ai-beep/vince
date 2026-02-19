/**
 * Ambient declaration for optional @xdevplatform/xdk.
 * The package is dynamically imported at runtime; when missing, we fall back to fetch.
 */
declare module "@xdevplatform/xdk" {
  export const Client: new (config: { bearerToken?: string }) => unknown;
  export const PostPaginator:
    | (new (fetcher: (token?: string) => Promise<unknown>) => unknown)
    | undefined;
}
