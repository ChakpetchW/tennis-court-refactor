import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock global browser APIs if needed
global.fetch = vi.fn()
