import '@testing-library/jest-dom'
import { vi } from 'vitest'

// dhtmlx-gantt가 사용하는 Canvas 등 전역 객체 모킹
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))
