/**
 * The contexts a dsl-ui component may need from the HOST (the app shell around the views), by name. A host declares which of them it
 * provides (`providedContexts` of the DSL compiler, a list its settings can serve), and a module's build or test checks its views
 * against that list offline, without the host running: a view that needs one the host lacks is reported before it ships.
 * Read from a Node script through the package export `@wadeck-app/dsl-ui`.
 */
export const HOST_CONTEXTS = ['AbExperimentsContext', 'HeaderActionsContext', 'RouterContext', 'ThemeContext', 'ToastContext', 'UrlParamContext'] as const;

export type HostContext = (typeof HOST_CONTEXTS)[number];
