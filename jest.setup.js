import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for Node.js environment (required by some packages)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;