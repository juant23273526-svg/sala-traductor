import { useState } from 'react';
import { WelcomeScreen } from '@/components/home/WelcomeScreen';
import { RoomScreen } from '@/components/room/RoomScreen';
import type { RoomRole } from '@/types/room';

type View = { screen: 'home' } | { screen: 'room'; roomCode: string; role: RoomRole };

export default function App() {
  const [view, setView] = useState<View>({ screen: 'home' });

  if (view.screen === 'room') {
    return (
      <RoomScreen
        roomCode={view.roomCode}
        role={view.role}
        onLeave={() => setView({ screen: 'home' })}
      />
    );
  }

  return (
    <WelcomeScreen onEnterRoom={(roomCode, role) => setView({ screen: 'room', roomCode, role })} />
  );
}
