export function usesAdvancedConsole(lang: string) {
    return lang === 'mql' || lang === 'cypher';
}