import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock global browser APIs if needed
globalThis.fetch = vi.fn()
