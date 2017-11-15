const storageKey = "timesheetLog";
const dayIn = "day_in";
const dayOut = "day_out";
const mealIn = "lunch_in";
const mealOut = "lunch_out";

const debug = true;

Storage.prototype.setObj = function(key, obj) {
    return this.setItem(key, JSON.stringify(obj))
}

Storage.prototype.getObj = function(key) {
    return JSON.parse(this.getItem(key))
}

function prettyTime(hours, minutes) {
  let meridiem = "am";
  if (hours >= 12) {
    meridiem = "pm";
  }
  
  if (hours > 12) {
    hours -= 12;
  }
  
  if (minutes < 10) {
    minutes = minutes.toString().padStart(2, "0");
  }
  
  return `${hours}:${minutes} ${meridiem}`
};

function dateLoop() {
	let intervalID = setInterval(function () {
		let date = new Date();
		if (date.getSeconds() === 0) {
			$("#currentTime").text(prettyTime(date.getHours(), date.getMinutes()));
			updateMessage();
		}
	}, 1000);
};

function getLastItem(arr) {
	if (arr.length === 0) {
		return null;
	}
	return arr[arr.length - 1];
}

/*************************
 * Time update functions *
 *************************/


// Store time in local storage
function storeTime(storageKey, buttonValue, inputTime) {
	let timesheetLog = localStorage.getObj(storageKey);
	timesheetLog.push([buttonValue, inputTime]);
	localStorage.setObj(storageKey, timesheetLog);
}

// Parses time in format hh:mm and returns total minutes
function parseStoredTime(time) {
	let hours = parseInt(time.substring(0,2));
	let minutes = parseInt(time.substring(3,5));
	return 60 * hours + minutes;
}

// Convert minutes to hours and minutes
function convertTimeToPrettyTime(minutes) {
	return [Math.floor(minutes/60), minutes % 60];
}

// Convert hours and minutes to minutes
function convertPrettyTimeToTime(hours, minutes) {
	return 60 * hours + minutes;
}

// Convert date to input time
function convertDateToMinutes(date) {
	return 60 * date.getHours() + date.getMinutes();
}

// Calculates total time worked and returns total minutes
// Validation already performed in logTime
function calculateTimeWorked(timesheetLog, date) {
	if (timesheetLog.length === 0) {
		return 0;
	} else if (timesheetLog.length === 1) {
		return convertDateToMinutes(date) - parseStoredTime(getLastItem(timesheetLog)[1]);
	}
	let total = 0;
	for (i = 1; i < timesheetLog.length; i++) {
		if (i % 2 === 1) {
			total += (parseStoredTime(timesheetLog[i][1]) - parseStoredTime(timesheetLog[i-1][1]));
		}
	}
	if (timesheetLog.length % 2 === 1) {
		total += convertDateToMinutes(date) - parseStoredTime(getLastItem(timesheetLog)[1]);
	}
	return total;
}

// Check if a meal break was taken
function mealBreaks(timesheetLog) {
	let breaks = 0;
	let breakStart = false;
	let breakEnd = false;
	for (i = 0; i < timesheetLog.length; i++) {
		if (timesheetLog[i][0] === mealIn) {
			breakEnd = true;
		} else if (timesheetLog[i][0] === mealOut) {
			breakStart = true;
		}
		if (breakStart && breakEnd) {
			breaks += 1;
			breakStart = false;
			breakEnd = false;
		}
	}
	return breaks;
}

function estimateTimeLeft(currentHours, currentMinutes, targetHours, targetMinutes) {
	let currentTime = convertPrettyTimeToTime(currentHours, currentMinutes);
	let targetTime = convertPrettyTimeToTime(targetHours, targetMinutes);
	
	return convertTimeToPrettyTime(targetTime - currentTime);
}

function addTime(currentHour, currentMinute, hoursToAdd, minutesToAdd) {
	let currentTime = convertPrettyTimeToTime(currentHour, currentMinute);
	let timeToAdd = convertPrettyTimeToTime(hoursToAdd, minutesToAdd);
	
	return convertTimeToPrettyTime(currentTime + timeToAdd);
}

// Generate a message to estimate when to clock out at the end of the day
function endOfDayMessage(hours, minutes, date, timesheetLog) {
	let [remainingHours, remainingMinutes] = estimateTimeLeft(hours, minutes, 8, 0)
	
	if (mealBreaks(timesheetLog) === 0) {
		remainingMinutes += 30;
	}
	
	let [endOfDayHours, endOfDayMinutes] = addTime(date.getHours(), date.getMinutes(), remainingHours, remainingMinutes);
	
	return `Estimated end of day is ${prettyTime(endOfDayHours, endOfDayMinutes)}.`;
}

// Update displayed message
function updateMessage() {
	let timesheetLog = localStorage.getObj(storageKey);
	let date = new Date();
	if (timesheetLog.length === 0) {
		let greeting;
		if (date.getHours() < 12) {
			greeting = "Good morning!";
		} else if (date.getHours() < 17) {
			greeting = "Good afternoon!";
		} else {
			greeting = "Good evening!";
		}
		$('#currentMessage').html(`${greeting} You have not clocked in today.`);
	} else {
		let currentStatus = getLastItem(localStorage.getObj(storageKey))[0];
		let [hours, minutes] = convertTimeToPrettyTime(calculateTimeWorked(timesheetLog, date));
		let totalBreaks = mealBreaks(timesheetLog);
		let message;
		
		// Check status
		if (currentStatus === dayIn) {
			message = `You've worked for ${hours} hours and ${minutes} minutes today.`;
			if (hours < 8) {
				message += ` ${endOfDayMessage(hours, minutes, date, timesheetLog)}`;
			}
		} else if (currentStatus === mealOut) {
			let [mealHours, mealMinutes] = convertTimeToPrettyTime(convertDateToMinutes(date)
																	- parseStoredTime(getLastItem(timesheetLog)[1]));
			if (mealHours > 0) {
				message = `You've been on break for ${mealHours} hours and ${mealMinutes} minutes.`;
			} else {
				message = `You've been on break for ${mealMinutes} minutes.`;
			}
		} else if (currentStatus === mealIn) {
			message = `You've worked for ${hours} hours and ${minutes} minutes today.`
			let [mealHours, mealMinutes] = convertTimeToPrettyTime(parseStoredTime(getLastItem(timesheetLog)[1])
																	- parseStoredTime(timesheetLog[timesheetLog.length - 2][1]));
			if (mealHours > 0) {
				message += ` Your last break was ${mealHours} hours and ${mealMinutes} minutes long.`;
			} else {
				message += ` Your last break was ${mealMinutes} minutes long.`;
			}
			
			if (hours < 8) {
				message += ` ${endOfDayMessage(hours, minutes, date, timesheetLog)}`;
			}
		} else if (currentStatus === dayOut) {
			message = `You worked ${hours} hours and ${minutes} minutes during your last shift. Thanks for your hard work!`;
		}
		
		// Check for meal breaks
		if (totalBreaks === 0 && (currentStatus === dayIn || currentStatus === mealIn)) {
			if (hours < 5) {
				let [estimatedHours, estimatedMinutes] = estimateTimeLeft(hours, minutes, 5, 0);
				let [mealTimeHours, mealTimeMinutes] = addTime(date.getHours(), date.getMinutes(), estimatedHours, estimatedMinutes);
				message += ` You must take a meal break by ${prettyTime(mealTimeHours, mealTimeMinutes)}.`;
			} else {
				message += ` You need to take a meal break.`;
			}
		} else if (totalBreaks === 1 && hours > 8 && (currentStatus === dayIn || currentStatus === mealIn)) {
			if (hours < 10) {
				let [estimatedHours, estimatedMinutes] = estimateTimeLeft(hours, minutes, 10, 0);
				let [mealTimeHours, mealTimeMinutes] = addTime(date.getHours(), date.getMinutes(), estimatedHours, estimatedMinutes);
				message += ` You must take a second meal break by ${prettyTime(mealTimeHours, mealTimeMinutes)}.`;
			} else {
				message += ` You need to take a meal break.`;
			}
		}
		
		// Set the message
		$('#currentMessage').html(message);
	}
	
}

function raiseError(errorCode, text = null) {
	if (errorCode === 1) {
		if (debug === true) {
			console.log(`Invalid input '${text}'`);
		}
		$('#errorMessage').html("<strong>Error!</strong> Invalid button type. Did you click the right button?");
	} else if (errorCode === 2) {
		$('#errorMessage').html("<strong>Error!</strong> Invalid input time. Please enter a time.");
	}
	$('#errorMessage').css("display", "block");
}

function resetError() {
	$('#errorMessage').html("");
	$('#errorMessage').css("display", "none");
}


// Define time button behavior
function logTime(timeButton) {
	resetError();
	let buttonValue = timeButton.value;
	let inputTime = $('#inputTime').val();
	if (!inputTime) {
		return raiseError(2);
	}
	let lastLogItem = getLastItem(localStorage.getObj(storageKey));
	if (debug === true) {
		console.log(`Button value: ${buttonValue}`);
		console.log(`Input time: ${inputTime}`);
	}
	
	// Validate button press
	switch(buttonValue) {
		case dayIn:
			if (lastLogItem && lastLogItem[0] != dayOut) {
				return raiseError(1, buttonValue);
			}
			break;
		case dayOut:
			if (!lastLogItem || (lastLogItem[0] != dayIn && lastLogItem[0] != mealIn)) {
				return raiseError(1, buttonValue);
			}
			break;
		case mealIn:
			if (!lastLogItem || lastLogItem[0] != mealOut) {
				return raiseError(1, buttonValue);
			}
			break;
		case mealOut:
			if (!lastLogItem || (lastLogItem[0] != dayIn && lastLogItem[0] != mealIn)) {
				return raiseError(1, buttonValue);
			}
			break;
		default:
			return raiseError(null);
	}
	
	storeTime(storageKey, buttonValue, inputTime);
	updateMessage();
}

/*********************
 * Startup functions *
 *********************/

 // TODO: set up reset 
$( document ).ready(function() {
	// Initialize time
	let date = new Date();
	$("#currentTime").text(prettyTime(date.getHours(), date.getMinutes()));
	
	// Initialize localStorage
	if (localStorage.getItem(storageKey) === null || debug === true) {
		localStorage.setObj(storageKey, new Array());
	}
	
	updateMessage();
	
	// Start looping
	dateLoop();
	
});