import React, { useState, useEffect } from 'react';

const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // El intervalo sigue siendo de 1 segundo para que el cambio de minuto sea instantáneo
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Limpia el intervalo cuando el componente se desmonta
    return () => {
      clearInterval(timerId);
    };
  }, []);

  // Formatea la hora a HH:MM
  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="text-2xl font-semibold text-green-300 tracking-wider [text-shadow:0_0_3px_theme(colors.green.400/0.8)]" title="hora actual">
      {formatTime(time)}
    </div>
  );
};

export default DigitalClock;
