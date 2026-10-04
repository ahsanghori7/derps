import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import Heading from '../Heading';

const generateCustomGrid = (startDate, endDate, events = []) => {
  const start = moment(startDate).startOf('week'); // Start from Sunday
  const end = moment(endDate).endOf('week');       // End on Saturday

  const day = start.clone();
  const calendar = [];

  while (day.isSameOrBefore(end, 'day')) {
    const dateStr = day.format('YYYY-MM-DD');
    const matchedEvent = events.find(e => e.id === dateStr);

    const dayEvents = matchedEvent?.events || [];
    const dayTasks = matchedEvent?.tasks || matchedEvent?.assignments || [];

    calendar.push({
      date: dateStr,
      events: dayEvents,
      tasks: dayTasks,
      isInRange: moment(dateStr).isBetween(startDate, endDate, 'millisecond', '[]'),
    });

    day.add(1, 'day');
  }

  return calendar;
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const daysOfWeekShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Soft, theme-aware color rotation for events (order they appear on a given day)
const eventPalette = [
  { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
];
const defaultEventStyle = { dot: 'bg-yellow-500', chip: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300' };
const taskStyle = { dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' };

const MAX_VISIBLE_ITEMS = 3;

const buildDayItems = (day) => [
  ...(day?.events || []).map((data, i) => ({ type: 'event', data, eventIndex: i })),
  ...(day?.tasks || []).map((data) => ({ type: 'task', data })),
];

const CalendarGrid = ({ events, onTaskClick, viewMode, currentMonth, currentWeek, currentYear, todayTick }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);

  const today = moment();
  const monthStart = (currentMonth ? moment(currentMonth) : moment()).startOf('month');
  const monthEnd = (currentMonth ? moment(currentMonth) : moment()).endOf('month');
  const monthSchedule = generateCustomGrid(monthStart, monthEnd, events);
  const weekStart = (currentWeek ? moment(currentWeek) : moment()).startOf('week');
  const weekEnd = (currentWeek ? moment(currentWeek) : moment()).endOf('week');
  const weekSchedule = generateCustomGrid(weekStart, weekEnd, events);

  const schedule = viewMode === 'This Week' ? weekSchedule : monthSchedule;

  // Derive the selected day directly from the events fed in by the parent (already
  // keyed by date) so the modal stays up to date and works the same across week/month/year views.
  const selectedDay = selectedDate ? events.find((e) => e.id === selectedDate) : null;

  // Opening the calendar to "Today" should also pop open today's cell.
  useEffect(() => {
    if (todayTick) {
      setSelectedDate(moment().format('YYYY-MM-DD'));
    }
  }, [todayTick]);

  const handleItemClick = (item, type) => {
    setSelectedDate(null);
    if (type === 'event') {
      onTaskClick(item);
    } else {
      navigate('/home/myTask');
    }
  };

  const renderItem = (item, type, key, eventIndex) => {
    const style = type === 'event' ? eventPalette[eventIndex] || defaultEventStyle : taskStyle;

    return (
      <div
        key={key}
        onClick={(e) => {
          e.stopPropagation();
          handleItemClick(item, type);
        }}
        title={item?.title}
        className={`group flex items-start gap-1.5 cursor-pointer rounded-md px-1.5 py-1 leading-tight transition-colors hover:brightness-95 dark:hover:brightness-110 ${style.chip}`}
      >
        <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium">{item?.title}</span>
          {type === 'event' && (
            <span className="block truncate text-[11px] opacity-80">
              {moment(item?.startTime, 'HH:mm:ss').format('hh:mm A')} - {moment(item?.endTime, 'HH:mm:ss').format('hh:mm A')}
            </span>
          )}
        </span>
      </div>
    );
  };

  const selectedDayItems = selectedDay ? buildDayItems(selectedDay) : [];

  const renderYearView = () => {
    const yearStart = (currentYear ? moment(currentYear) : moment()).startOf('year');
    const months = Array.from({ length: 12 }, (_, i) => yearStart.clone().month(i).startOf('month'));

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map((mStart, monthIndex) => {
          const mEnd = mStart.clone().endOf('month');
          const mSchedule = generateCustomGrid(mStart, mEnd, events);

          return (
            <div
              key={monthIndex}
              className="rounded-xl border p-2"
              style={{ borderColor: 'var(--sidebar-divider)', backgroundColor: 'var(--dashboard-card-bg)' }}
            >
              <Heading Fontweight={700} color={'var(--dashboard-text-primary)'} Heading={mStart.format('MMMM')} Fontsize={14} />
              <div className="mt-2 grid grid-cols-7 gap-0.5">
                {daysOfWeekShort.map((d, i) => (
                  <span
                    key={i}
                    className="text-center text-[9px] font-semibold uppercase"
                    style={{ color: 'var(--dashboard-tab-text-inactive)' }}
                  >
                    {d}
                  </span>
                ))}
                {mSchedule.map((day, dayIndex) => {
                  const isToday = moment(day.date).isSame(today, 'day');
                  const hasItems = day.isInRange && buildDayItems(day).length > 0;

                  return (
                    <div
                      key={dayIndex}
                      onClick={() => day.isInRange && setSelectedDate(day.date)}
                      className={`flex flex-col items-center justify-center gap-0.5 rounded-md py-1 ${day.isInRange ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/10' : ''
                        }`}
                    >
                      <span
                        className={
                          isToday
                            ? 'flex h-4 w-4 items-center justify-center rounded-full bg-[#0C79F7] text-[10px] font-bold text-white'
                            : 'text-[10px]'
                        }
                        style={
                          isToday
                            ? undefined
                            : { color: day.isInRange ? 'var(--dashboard-text-primary)' : 'var(--dashboard-tab-text-inactive)', opacity: day.isInRange ? 1 : 0.35 }
                        }
                      >
                        {moment(day.date).date()}
                      </span>
                      <span className={`h-1 w-1 rounded-full ${hasItems ? 'bg-[#0C79F7]' : 'bg-transparent'}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      {viewMode === 'This Year' ? (
        renderYearView()
      ) : (
        <>
      {/* Weekday header */}
      <div
        className="grid grid-cols-7 rounded-t-2xl overflow-hidden border border-b-0"
        style={{ borderColor: 'var(--sidebar-divider)' }}
      >
        {daysOfWeek.map((day, index) => (
          <div
            key={index}
            className="py-3 text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--dashboard-tab-box)',
              color: 'var(--dashboard-tab-text-inactive)',
            }}
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 gap-px rounded-b-2xl overflow-hidden border"
        style={{ backgroundColor: 'var(--sidebar-divider)', borderColor: 'var(--sidebar-divider)' }}
      >
        {schedule.map((day, index) => {
          const isToday = moment(day.date).isSame(today, 'day');
          const dayItems = day.isInRange ? buildDayItems(day) : [];
          const visibleItems = dayItems.slice(0, MAX_VISIBLE_ITEMS);
          const hiddenCount = dayItems.length - visibleItems.length;

          return (
            <div
              key={index}
              onClick={() => day.isInRange && setSelectedDate(day.date)}
              className={`relative flex min-h-[92px] sm:min-h-[120px] xl:min-h-[136px] flex-col gap-1 p-1.5 sm:p-2 transition-colors hover:z-10 ${day.isInRange ? 'cursor-pointer' : ''
                }`}
              style={{
                backgroundColor: 'var(--dashboard-card-bg)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--dashboard-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--dashboard-card-bg)')}
            >
              <div className="flex items-center justify-between">
                <span
                  className={
                    isToday
                      ? 'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0C79F7] text-xs font-extrabold text-white shadow-sm sm:h-7 sm:w-7 sm:text-sm'
                      : 'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm'
                  }
                  style={
                    isToday
                      ? undefined
                      : { color: day.isInRange ? 'var(--dashboard-text-primary)' : 'var(--dashboard-tab-text-inactive)', opacity: day.isInRange ? 1 : 0.5 }
                  }
                >
                  {moment(day.date).date()}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                {visibleItems.map((it, i) =>
                  renderItem(it.data, it.type, `${it.type}-${i}`, it.eventIndex),
                )}
                {hiddenCount > 0 && (
                  <span
                    className="mt-auto rounded-md px-1.5 py-0.5 text-center text-[11px] font-medium transition-colors hover:brightness-95 dark:hover:brightness-110"
                    style={{ backgroundColor: 'var(--dashboard-bg)', color: 'var(--dashboard-text-secondary)' }}
                  >
                    +{hiddenCount} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Day detail modal — shows every event/task for the clicked day */}
      {selectedDay && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30"
          style={{ zIndex: 9999 }}
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl p-6 shadow-lg"
            style={{ backgroundColor: 'var(--dashboard-card-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedDate(null)}
              className="absolute right-4 top-4 text-2xl leading-none"
              style={{ color: 'var(--sidebar-text-primary)' }}
            >
              ×
            </button>
            <Heading
              Fontweight={700}
              color={'var(--sidebar-text-primary)'}
              Heading={moment(selectedDate).format('dddd, MMMM D, YYYY')}
              Fontsize={18}
            />

            <div className="mt-4 flex flex-col gap-2">
              {selectedDayItems.length > 0 ? (
                selectedDayItems.map((it, i) => (
                  <div
                    key={`${it.type}-${i}`}
                    onClick={() => handleItemClick(it.data, it.type)}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 transition-colors hover:brightness-95 dark:hover:brightness-110 ${(it.type === 'event' ? eventPalette[it.eventIndex] || defaultEventStyle : taskStyle).chip
                      }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${(it.type === 'event' ? eventPalette[it.eventIndex] || defaultEventStyle : taskStyle).dot
                        }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{it.data?.title}</div>
                      {it.type === 'event' ? (
                        <div className="text-xs opacity-80">
                          {moment(it.data?.startTime, 'HH:mm:ss').format('hh:mm A')} - {moment(it.data?.endTime, 'HH:mm:ss').format('hh:mm A')}
                        </div>
                      ) : (
                        <div className="text-xs opacity-80">Task</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm" style={{ color: 'var(--dashboard-text-secondary)' }}>
                  No events or tasks for this day.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarGrid;
