
import React, { useMemo } from 'react';

interface CalendarProps {
  currentDate: Date;
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
  highlightedDays: string[]; // YYYY-MM-DD format
  onMonthChange: (newDate: Date) => void;
}

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const Calendar: React.FC<CalendarProps> = ({ currentDate, selectedDate, onDateClick, highlightedDays, onMonthChange }) => {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const grid = [];
    let day = 1;

    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < startDayOfWeek) {
          week.push(null);
        } else if (day > daysInMonth) {
          week.push(null);
        } else {
          week.push(new Date(year, month, day));
          day++;
        }
      }
      grid.push(week);
      if(day > daysInMonth) break;
    }
    return grid;
  }, [month, year]);
  
  const today = new Date();
  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => onMonthChange(new Date(year, month - 1, 1))} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-bold capitalize">
          {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => onMonthChange(new Date(year, month + 1, 1))} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {WEEK_DAYS.map(day => <div key={day} className="font-semibold text-sm text-slate-400">{day}</div>)}
        {calendarGrid.flat().map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          const dateString = date.toISOString().split('T')[0];
          
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const isHighlighted = highlightedDays.includes(dateString);

          let bgClass = 'hover:bg-slate-700';
          if (isSelected) bgClass = 'bg-cyan-500 text-white';
          else if (isHighlighted) bgClass = 'bg-indigo-500 text-white';
          else if (isToday) bgClass = 'bg-slate-600 text-white';

          return (
            <div
              key={dateString}
              onClick={() => onDateClick(date)}
              className={`p-2 rounded-full cursor-pointer transition-colors duration-200 ${bgClass}`}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
