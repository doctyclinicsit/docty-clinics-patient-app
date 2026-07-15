export type RoomSessionCommand = {
  type: 'start' | 'stop' | 'pair-request' | 'pair-confirmed';
  room: string;
  sessionId: string;
  appointmentId: string;
  patientName: string;
  sentAt: number;
  pairingCode?: string;
  deviceId?: string;
  deviceName?: string;
};

export const ROOM_CHANNEL = 'docty-room-consultations-v1';

export function roomChannel() {
  return new BroadcastChannel(ROOM_CHANNEL);
}
