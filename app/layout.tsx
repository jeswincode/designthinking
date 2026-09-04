import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Faculty — Your academic workspace', description: 'An offline-first workspace for teaching, research, mentoring, schedules and documents.' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
