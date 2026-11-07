// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ConnectionIndicator } from './ConnectionIndicator';
afterEach(cleanup);
it.each([[0,'0.0'],[82.36,'82.4'],[999.9,'999.9'],[1000,'1.0K'],[12345,'12.3K'],[1000000,'1.0M']])('formats Hubble rate %s using its adaptive unit', (fps,expected)=>{
 render(<ConnectionIndicator state="receiving" flowsPerSec={Number(fps)} nodesConnected={1} totalNodes={1}/>);
 expect(screen.getByText(`${expected} flows/s`)).toBeTruthy();
});
it('renders relay node availability, with the original typography and indicator size',()=>{
 render(<ConnectionIndicator state="receiving" flowsPerSec={82.36} nodesConnected={1} totalNodes={2}/>);
 expect(screen.getByText('82.4 flows/s')).toBeTruthy();
 expect(screen.getByText('1/2 nodes')).toBeTruthy();
 expect(getComputedStyle(screen.getByTestId('hubble-connection-indicator')).fontSize).toBe('14px');
});
it('does not replace missing relay status with zero rate or service card counts',()=>{
 render(<ConnectionIndicator state="receiving"/>);
 expect(screen.getByText('Receiving…')).toBeTruthy();
 expect(screen.queryByText(/flows\/s|nodes|services/)).toBeNull();
});
