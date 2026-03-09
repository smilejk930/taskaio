/* dhtmlx-gantt 타입 선언
 * dhtmlx-gantt 라이브러리는 자체 타입 선언이 불완전하므로,
 * 최소한의 타입을 직접 선언하여 빌드 오류를 방지한다.
 */
declare module 'dhtmlx-gantt' {
    interface GanttStatic {
        config: Record<string, unknown>
        init(container: HTMLElement): void
        clearAll(): void
        parse(data: unknown): void
        render(): void
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attachEvent(event: string, handler: (...args: any[]) => any): string
        detachEvent(id: string): void
        addMarker(marker: {
            start_date: Date
            css?: string
            text?: string
            id?: string
        }): string
        deleteMarker(id: string): void
        filter: ((id: string, item: Record<string, unknown>) => boolean) | null
    }

    export const gantt: GanttStatic
}

declare module 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
