import { useState, useRef, useEffect, useCallback } from 'react';
import type { CanvasAPI, EventBus, ID } from '@netx/sdk';
import { executeCommand, getPrompt } from './ios-engine.js';
import type { DeviceCLIState } from './ios-engine.js';
import { deviceStates, getOrCreateDeviceState, saveCLIStates } from './cli-persistence.js';

interface TerminalProps {
  deviceId: ID;
  deviceType: string;
  hostname: string;
  ports: string[];
  canvasAPI: CanvasAPI;
  eventBus?: EventBus;
}

export function Terminal({ deviceId, deviceType, hostname, ports, canvasAPI, eventBus }: TerminalProps) {
  const getOrCreate = useCallback(() => {
    return getOrCreateDeviceState(deviceId, hostname, ports);
  }, [deviceId, hostname, ports]);

  const [cliState, setCLIState] = useState<DeviceCLIState>(getOrCreate);
  const [input, setInput] = useState('');
  const [outputLines, setOutputLines] = useState<string[]>([
    '',
    `NetX IOS Simulator — ${deviceType}`,
    `Type "?" for available commands.`,
    '',
  ]);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [deviceId]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const prompt = getPrompt(cliState);
    const result = executeCommand(input, cliState, canvasAPI, eventBus);

    const newLines = [`${prompt} ${input}`];
    if (result.output) {
      newLines.push(...result.output.split('\n'));
    }

    setCLIState(result.state);
    deviceStates.set(deviceId, result.state);
    saveCLIStates();
    setOutputLines((prev) => [...prev, ...newLines]);
    setInput('');
  }, [input, cliState, canvasAPI, deviceId, eventBus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const hist = cliState.history;
      if (hist.length === 0) return;
      const idx = Math.max(0, (cliState.historyIndex ?? hist.length) - 1);
      setInput(hist[idx] ?? '');
      setCLIState((s) => ({ ...s, historyIndex: idx }));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const hist = cliState.history;
      const idx = Math.min(hist.length, (cliState.historyIndex ?? hist.length) + 1);
      setInput(idx >= hist.length ? '' : (hist[idx] ?? ''));
      setCLIState((s) => ({ ...s, historyIndex: idx }));
    }
  }, [cliState]);

  const prompt = getPrompt(cliState);

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: '#0a0a12', borderRadius: '4px', overflow: 'hidden',
        fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
        fontSize: '14px',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', background: '#1a1a28', borderBottom: '1px solid #2a2a3e',
        fontSize: '13px', color: '#888',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88' }} />
        <span>{cliState.hostname}</span>
        <span style={{ color: '#555' }}>|</span>
        <span style={{ color: '#00bceb' }}>{deviceType}</span>
        <span style={{ color: '#555' }}>|</span>
        <span style={{ color: '#666' }}>{cliState.mode}</span>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        style={{
          flex: 1, overflow: 'auto', padding: '8px 10px',
          color: '#ccc', lineHeight: '1.6', whiteSpace: 'pre-wrap',
        }}
      >
        {outputLines.map((line, i) => (
          <div key={i} style={{
            color: line.startsWith('%') ? '#ffaa00' : line.startsWith('  ^') ? '#ff4444' : '#ccc',
          }}>
            {line}
          </div>
        ))}
      </div>

      {/* Input line */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', padding: '4px 10px 8px', alignItems: 'center' }}>
        <span style={{ color: '#00ff88', marginRight: '4px', whiteSpace: 'nowrap' }}>{prompt}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontFamily: 'inherit', fontSize: 'inherit',
            caretColor: '#00ff88',
          }}
        />
      </form>
    </div>
  );
}
