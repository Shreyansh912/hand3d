import { useEffect, useRef, useState, useCallback } from "react";

export interface SensorTelemetryPacket {
  timestamp: string;
  sensor_rpm: number;
  sensor_torque_nm: number;
  vibration_rms_mms: number;
  ambient_temp_c: number;
  is_shock_anomaly: boolean;
  sensor_health: "ONLINE" | "OFFLINE";
}

export function useSensorStream(enabled: boolean) {
  const [telemetry, setTelemetry] = useState<SensorTelemetryPacket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const ws = new WebSocket("ws://localhost:8000/ws/telemetry");
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const packet: SensorTelemetryPacket = JSON.parse(event.data);
          setTelemetry(packet);
        } catch (err) {
          console.error("Packet parse error:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = (err) => {
        console.warn("WebSocket stream error:", err);
      };
    } catch (err) {
      console.error("Failed to connect WebSocket:", err);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setTelemetry(null);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  return { telemetry, isConnected };
}