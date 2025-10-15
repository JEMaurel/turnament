import React, { useMemo } from 'react';

interface CalendarProps {
  currentDate: Date;
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
  highlightedDays: string[];
  recurringHighlightDays?: string[];
  onMonthChange: (newDate: Date) => void;
  weeksToShow?: number;
  showNavigation?: boolean;
  onGoToToday?: () => void;
  showGoToTodayButton?: boolean;
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const Calendar: React.FC<CalendarProps> = ({ 
  currentDate, 
  selectedDate, 
  onDateClick, 
  highlightedDays, 
  recurringHighlightDays = [],
  onMonthChange,
  weeksToShow = 6,
  showNavigation = true,
  onGoToToday,
  showGoToTodayButton = false
}) => {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const grid: ({ date: Date; isCurrentMonth: boolean } | null)[][] = [];
    let day = 1;
    let nextMonthDay = 1;

    for (let i = 0; i < weeksToShow; i++) {
      const week: ({ date: Date; isCurrentMonth: boolean } | null)[] = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < startDayOfWeek) {
          week.push(null);
        } else if (day > daysInMonth) {
          week.push({
            date: new Date(year, month + 1, nextMonthDay++),
            isCurrentMonth: false,
          });
        } else {
          week.push({
            date: new Date(year, month, day++),
            isCurrentMonth: true,
          });
        }
      }
      grid.push(week);
      
      // Stop adding rows if we have already rendered all days of the current month.
      // This makes the calendar height dynamic (4, 5 or 6 rows) for the main calendar.
      if (weeksToShow === 6 && day > daysInMonth) {
        break;
      }
    }
    return grid;
  }, [month, year, weeksToShow]);
  
  const today = new Date();
  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow-lg">
      {showNavigation && (
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
      )}
       {!showNavigation && (
         <div className="relative flex justify-center items-center mb-4">
            <h2 className="text-xl font-bold capitalize text-center">
                {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            {showGoToTodayButton && onGoToToday && (
                <button 
                    onClick={onGoToToday} 
                    className="absolute top-0 right-0 p-2 rounded-full hover:bg-slate-700 transition-colors"
                    title="Volver al día de hoy"
                    aria-label="Volver al día de hoy"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                </button>
            )}
         </div>
       )}
      <div className="grid grid-cols-7 gap-2 text-center">
        {WEEK_DAYS.map((day, index) => 
            <div key={day} className={`font-semibold text-sm ${index >= 5 ? 'text-slate-500' : 'text-slate-400'}`}>{day}</div>
        )}
        {calendarGrid.flat().map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} />;
          
          const { date, isCurrentMonth } = cell;
          const dateString = date.toISOString().split('T')[0];
          
          const dayOfWeek = date.getDay();
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const isHighlighted = highlightedDays.includes(dateString);
          const isRecurringHighlighted = recurringHighlightDays.includes(dateString);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          // New condition for the special overlap case
          const isSpecialTripleOverlap = isToday && isHighlighted && isRecurringHighlighted;

          let cellClasses = 'relative p-2 rounded-full transition-colors duration-200';
          
          if (!isCurrentMonth) {
            cellClasses += ' text-slate-600 cursor-not-allowed';
          } else {
            cellClasses += ' cursor-pointer';
            
            // 1. Determine background color based on a clear priority
            if (isSelected) {
                cellClasses += ' bg-cyan-500 text-white';
            } else if (isHighlighted) { // A day with a patient appointment (violet) always has priority
                cellClasses += ' bg-indigo-500 text-white';
            } else if (isRecurringHighlighted) { // A day with recurring availability (green)
                cellClasses += ' bg-green-500 text-white';
            } else if (isToday) { // A normal 'today'
                cellClasses += ' bg-slate-600 text-white';
            } else if (isWeekend) {
                cellClasses += ' text-slate-500 hover:bg-slate-700';
            } else {
                cellClasses += ' hover:bg-slate-700';
            }

            // 2. Add indicators cumulatively, allowing them to stack.
            
            // The green "inner ring" (using box-shadow) for days with both
            // a patient turn (violet) and recurring availability.
            // This is NOT applied in the special triple overlap case.
            if (isHighlighted && isRecurringHighlighted && !isSpecialTripleOverlap) {
                // Using a colored shadow to simulate an inner ring that doesn't conflict with the outer 'ring'.
                cellClasses += ' shadow-[0_0_0_2px_theme(colors.green.500)]';
            }

            // The amber "outer ring" for today's date always has top priority.
            // It will stack visually on top of the shadow and background.
            if (isToday) {
                cellClasses += ' ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800';
            }
          }

          return (
            <div
              key={dateString}
              onClick={() => isCurrentMonth && onDateClick(date)}
              className={cellClasses}
            >
              {date.getDate()}
              {/* Render a more visible bar for the special case */}
              {isSpecialTripleOverlap && (
                <span className="absolute bottom-1 left-2 right-2 h-1 bg-green-400 rounded-full"></span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;