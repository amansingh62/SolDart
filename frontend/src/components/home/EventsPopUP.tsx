// components/EventsPopup.jsx
import { useState, useEffect } from 'react';
import { X as XIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Clock as ClockIcon, CheckCircle, Award } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import axios from 'axios';
import api from '@/lib/apiUtils';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';

interface CheckInData {
  canCheckIn: boolean;
  currentStreak: number;
  maxStreak: number;
  lastCheckIn: string | null;
  checkInHistory: Array<{ date: string; points: number }>;
}

interface EventsPopupProps {
  isOpen: boolean;
  onClose?: () => void;
  setIsOpen: (isOpen: boolean) => void;
  children: React.ReactNode;
}

const EventsPopup: React.FC<EventsPopupProps> = ({ isOpen, onClose, setIsOpen, children }) => {
  const [loading, setLoading] = useState(false);
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const { t } = useLanguage();
  
  // Get current month and year
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    now.toLocaleString('default', { month: 'short' }) + ' ' + now.getFullYear()
  );
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  
  // Generate calendar data for current month
  const generateCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Last day of current month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    // Convert to Monday-based index (0 = Monday, 6 = Sunday)
    let firstDayIndex = firstDay.getDay() - 1;
    if (firstDayIndex < 0) firstDayIndex = 6; // Sunday becomes 6
    
    const daysInMonth = lastDay.getDate();
    
    // Get days from previous month to fill the first week
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = [];
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      prevMonthDays.push({ 
        day: prevMonthLastDay - i, 
        month: 'prev' 
      });
    }
    
    // Current month days
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      
      // Check if this day is in the check-in history
      let isCheckedIn = false;
      if (checkInData?.checkInHistory) {
        isCheckedIn = checkInData.checkInHistory.some(record => {
          const recordDate = new Date(record.date);
          return recordDate.getDate() === i && 
                 recordDate.getMonth() === month && 
                 recordDate.getFullYear() === year;
        });
      }
      
      currentMonthDays.push({ 
        day: i, 
        month: 'current', 
        isToday, 
        isCheckedIn 
      });
    }
    
    // Next month days to complete the last week
    const nextMonthDays = [];
    const totalDays = prevMonthDays.length + currentMonthDays.length;
    const remainingDays = 42 - totalDays; // 6 rows of 7 days
    
    for (let i = 1; i <= remainingDays; i++) {
      nextMonthDays.push({ 
        day: i, 
        month: 'next' 
      });
    }
    
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };
  
  const days = generateCalendarDays();

  // Days of the week
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Generate the calendar grid
  const renderCalendar = () => {
    const weeks = [];
    let week: { day: number; month: string; isToday?: boolean; isCheckedIn?: boolean }[] = [];

    days.forEach((day, index) => {
      if (index > 0 && index % 7 === 0) {
        weeks.push(week);
        week = [];
      }
      week.push(day);
    });
    
    if (week.length > 0) {
      weeks.push(week);
    }

    return weeks;
  };

  const calendar = renderCalendar();
  
  // Fetch check-in data
  const fetchCheckInData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/check-in/status');
      setCheckInData(response.data);
    } catch (error) {
      console.error('Error fetching check-in data:', error);
      toast.error('Failed to load check-in data');
    } finally {
      setLoading(false);
    }
  };
  
  // Perform check-in
  const performCheckIn = async () => {
    try {
      setCheckingIn(true);
      const response = await api.post('/api/check-in/check-in');
      
      if (response.data.success) {
        toast.success(`Check-in successful! +${response.data.points} points`);
        fetchCheckInData(); // Refresh data
      }
    } catch (error: any) {
      console.error('Error during check-in:', error);
      const errorMessage = error.response?.data?.message || 'Failed to check in';
      toast.error(errorMessage);
    } finally {
      setCheckingIn(false);
    }
  };
  
  // Fetch data when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchCheckInData();
    }
  }, [isOpen]);
  
  // Handle open state change
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && onClose) {
      onClose();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger><div>{children}</div></PopoverTrigger>
      <PopoverContent className="w-full max-w-sm p-0 shadow-2xl rounded-lg mt-3 z-50 relative bg-white border border-gray-200">
        <div className="flex justify-between items-center p-3 border-b">
          <h2 className="text-lg mx-auto font-semibold">{t('Check In')}</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
            <XIcon size={18} />
          </button>
        </div>

        <div className="p-3 max-h-[70vh] overflow-y-auto">
          {/* Streak information */}
          <div className="flex items-center justify-between mb-3 bg-gradient-to-r from-[#ac7be1] via-[#c5a1ec] to-lime-50 rounded-lg p-3">
            <div className="flex items-center">
              <Award size={20} className="text-[#B671FF] mr-2" />
              <div>
                <div className="text-sm font-medium">Current Streak</div>
                <div className="text-xl font-bold text-[#6903d6]">{checkInData?.currentStreak || 0} days</div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-sm font-medium">Best Streak</div>
              <div className="text-lg font-semibold text-gray-700">{checkInData?.maxStreak || 0} days</div>
            </div>
          </div>

          {/* Month selector */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center bg-[#c59cf0] rounded-full px-3 py-1">
              <ChevronLeftIcon size={16} className="text-[#B671FF] cursor-pointer mr-1" />
              <span className="font-medium text-sm">{currentMonth}</span>
              <ChevronRightIcon size={16} className="text-[#B671FF] cursor-pointer ml-1" />
            </div>
            <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm">
              <ClockIcon size={14} className="text-gray-600 mr-1" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-gray-50 rounded-lg p-3">
            {/* Days of week */}
            <div className="grid grid-cols-7 mb-2">
              {daysOfWeek.map((day, index) => (
                <div key={index} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="space-y-1">
              {calendar.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIndex) => {
                    let dayClasses = "flex items-center justify-center h-8 w-8 rounded-full text-xs relative ";
                    
                    if (day.month === 'prev' || day.month === 'next') {
                      dayClasses += "text-gray-400";
                    } else if (day.isToday) {
                      dayClasses += "bg-[#B671FF] text-white";
                    } else if (day.isCheckedIn) {
                      dayClasses += "text-[#fff] bg-[#b682ed]";
                    } else {
                      dayClasses += "hover:bg-[#B671FF]";
                    }
                    
                    return (
                      <div key={`${weekIndex}-${dayIndex}`} className="flex justify-center">
                        <div className={dayClasses}>
                          {day.day}
                          {day.isCheckedIn && (
                            <CheckCircle size={10} className="absolute -top-1 -right-1 text-[#B671FF]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Check-in button */}
          <div className="mt-3">
          <button 
  onClick={performCheckIn}
  disabled={!checkInData?.canCheckIn || checkingIn || loading}
  className={`w-full py-2 px-4 rounded-full font-medium text-white flex items-center justify-center ${
    checkInData?.canCheckIn 
      ? 'bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black hover:text-white' 
      : 'bg-gray-400 cursor-not-allowed'
  }`}
>
  {loading ? (
    'Loading...'
  ) : checkingIn ? (
    'Checking in...'
  ) : !checkInData?.canCheckIn ? (
    'Already Checked In Today'
  ) : (
    'Check In Now'
  )}
</button>
          </div>

          {/* Streak benefits */}
          <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
            <h3 className="font-semibold mb-2">Streak Benefits</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-[#B671FF] flex items-center justify-center mr-2 text-xs font-bold">1</div>
                <span>Daily check-in: <span className="font-semibold">5 points</span></span>
              </li>
              <li className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-[#B671FF] flex items-center justify-center mr-2 text-xs font-bold">7</div>
                <span>Weekly streak: <span className="font-semibold">+10 bonus points</span></span>
              </li>
              <li className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-[#B671FF] flex items-center justify-center mr-2 text-xs font-bold">30</div>
                <span>Monthly streak: <span className="font-semibold">+50 bonus points</span></span>
              </li>
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EventsPopup;