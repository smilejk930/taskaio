/* dhtmlx-gantt 타입 선언
 * dhtmlx-gantt 라이브러리는 자체 타입 선언이 불완전하므로,
 * 최소한의 타입을 직접 선언하여 빌드 오류를 방지한다.
 */
declare module 'dhtmlx-gantt' {
    interface GanttStatic {
        config: Record<string, unknown> & {
            lightbox: {
                sections: unknown[]
            }
        }
        init(container: HTMLElement): void
        clearAll(): void
        parse(data: { data: unknown[], links?: unknown[] }): void
        render(): void
        attachEvent(event: string, handler: (...args: unknown[]) => unknown): string
        detachEvent(id: string): void
        addMarker(marker: {
            start_date: Date
            css?: string
            text?: string
            id?: string
            title?: string
        }): string
        deleteMarker(id: string): void
        calculateDuration(start: Date, end: Date): number
        getLightbox(): HTMLElement
        getTask(id: string | number): Record<string, unknown>
        refreshTask(id: string | number): void
        plugins(obj: Record<string, boolean>): void
        serverList(name: string, data?: unknown[]): unknown[]
        locale: Record<string, unknown> & {
            labels: Record<string, string>
        }
        keys: Record<string, unknown>
        templates: Record<string, unknown> & {
            timeline_cell_class: (task: Record<string, unknown>, date: Date) => string
            task_time: (start: Date, end: Date) => string
            tooltip_text: (start: Date, end: Date, task: Record<string, unknown>) => string
        }
        form_blocks: Record<string, unknown>
    }

    const gantt: GanttStatic
    export default gantt
}

declare module 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
