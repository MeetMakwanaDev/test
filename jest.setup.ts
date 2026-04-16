import "@testing-library/jest-dom";

// Signals to React 19 that this test environment supports act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
