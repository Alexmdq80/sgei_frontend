import Echo from "laravel-echo";
import Pusher from "pusher-js";
import api from "../services/api";
import { BACKEND_URL } from "../services/api";

window.Pusher = Pusher;

const appKey = import.meta.env.VITE_REVERB_APP_KEY;

let echo;

if (appKey) {
  echo = new Echo({
    broadcaster: "reverb",
    key: appKey,
    wsHost: import.meta.env.VITE_REVERB_HOST || "127.0.0.1" || "api.sgei.local",
    wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
    wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
    forceTLS: true,
    enabledTransports: ["ws", "wss"],
    // 🛡️ Usamos tu instancia de Axios para enviar las cookies de Sanctum y CSRF:
    authorizer: (channel) => {
      return {
        authorize: (socketId, callback) => {
          api
            .post(`${BACKEND_URL}/broadcasting/auth`, {
              socket_id: socketId,
              channel_name: channel.name,
            })
            .then((response) => {
              callback(null, response.data);
            })
            .catch((error) => {
              callback(error);
            });
        },
      };
    },
  });
} else {
  echo = {
    private: () => ({ listen: () => ({}) }),
    channel: () => ({ listen: () => ({}) }),
    leave: () => {},
  };
}

export default echo;
