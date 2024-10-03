import * as vscode from 'vscode';

let interval: NodeJS.Timeout | undefined;
let statusBarItem: vscode.StatusBarItem;
let timeLeft: number; // Time in seconds
let isWorkSession: boolean = true; // To track if it's a work session or break

export function activate(context: vscode.ExtensionContext) {

    // Register the command to start the Pomodoro timer
    let startTimerCommand = vscode.commands.registerCommand('pomodoro.start', async () => {
        if (!interval) {
            const { workTime, breakTime } = await getPomodoroTimes();
            if (workTime && breakTime) {
                startPomodoro(workTime, breakTime);
            }
        } else {
            vscode.window.showInformationMessage('Pomodoro is already running.');
        }
    });

    // Register the command to stop the Pomodoro timer
    let stopTimerCommand = vscode.commands.registerCommand('pomodoro.stop', () => {
        stopPomodoro();
    });

    // Register the command to start a break
    let breakCommand = vscode.commands.registerCommand('pomodoro.break', async () => {
        if (!interval) {
            const breakTime = await getBreakTime();
            if (breakTime) {
                startBreak(breakTime); // Start break directly
            }
        } else {
            vscode.window.showInformationMessage('Pomodoro is already running.');
        }
    });

    context.subscriptions.push(startTimerCommand);
    context.subscriptions.push(stopTimerCommand);
    context.subscriptions.push(breakCommand);

    // Create the status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(statusBarItem);
    statusBarItem.text = 'Pomodoro: Ready';
    statusBarItem.show();
}

// Prompt the user for work and break time intervals
async function getPomodoroTimes() {
    const defaultTimes = ['25 minutes', '15 minutes', '5 minutes (short break)', 'Custom'];

    const workTimeSelection = await vscode.window.showQuickPick(defaultTimes, {
        placeHolder: 'Select work time or enter a custom time'
    });

    let workTime = 25 * 60; // default work time is 25 minutes
    if (workTimeSelection === 'Custom') {
        const customWorkTime = await vscode.window.showInputBox({
            prompt: 'Enter custom work time (in minutes)',
            validateInput: (value) => isNaN(Number(value)) ? 'Please enter a valid number' : null
        });
        workTime = customWorkTime ? parseInt(customWorkTime) * 60 : workTime;
    } else if (workTimeSelection) {
        workTime = parseInt(workTimeSelection) * 60;
    }

    const breakTimeSelection = await vscode.window.showQuickPick(defaultTimes, {
        placeHolder: 'Select break time or enter a custom time'
    });

    let breakTime = 5 * 60; // default break time is 5 minutes
    if (breakTimeSelection === 'Custom') {
        const customBreakTime = await vscode.window.showInputBox({
            prompt: 'Enter custom break time (in minutes)',
            validateInput: (value) => isNaN(Number(value)) ? 'Please enter a valid number' : null
        });
        breakTime = customBreakTime ? parseInt(customBreakTime) * 60 : breakTime;
    } else if (breakTimeSelection) {
        breakTime = parseInt(breakTimeSelection) * 60;
    }

    return { workTime, breakTime };
}

// Prompt the user for a custom break time
async function getBreakTime() {
    const defaultTimes = ['5 minutes', '10 minutes', '15 minutes', 'Custom'];

    const breakTimeSelection = await vscode.window.showQuickPick(defaultTimes, {
        placeHolder: 'Select break time or enter a custom time'
    });

    let breakTime = 5 * 60; // default break time is 5 minutes
    if (breakTimeSelection === 'Custom') {
        const customBreakTime = await vscode.window.showInputBox({
            prompt: 'Enter custom break time (in minutes)',
            validateInput: (value) => isNaN(Number(value)) ? 'Please enter a valid number' : null
        });
        breakTime = customBreakTime ? parseInt(customBreakTime) * 60 : breakTime;
    } else if (breakTimeSelection) {
        breakTime = parseInt(breakTimeSelection) * 60;
    }

    return breakTime;
}

function startPomodoro(workTime: number, breakTime: number) {
    isWorkSession = true; // We're starting a work session
    timeLeft = workTime;

    // Update the status bar every second
    interval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(interval);
            interval = undefined;

            if (isWorkSession) {
                vscode.window.showInformationMessage('Pomodoro complete! Time for a break.');
                startBreak(breakTime); // Automatically start the break timer after work
            } else {
                vscode.window.showInformationMessage('Break complete! Time to get back to work.');
                startPomodoro(workTime, breakTime); // Automatically restart the Pomodoro after the break
            }
        } else {
            updateStatusBar();
            timeLeft--;
        }
    }, 1000);

    vscode.window.showInformationMessage('Pomodoro started!');
}

function startBreak(breakTime: number) {
    isWorkSession = false; // We're now in a break session
    timeLeft = breakTime;

    interval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(interval);
            interval = undefined;
            vscode.window.showInformationMessage('Break complete! Time to get back to work.');
            // Optionally restart the Pomodoro session after the break
        } else {
            updateStatusBar();
            timeLeft--;
        }
    }, 1000);

    statusBarItem.text = `Pomodoro: Break started`;
}

function stopPomodoro() {
    if (interval) {
        clearInterval(interval);
        interval = undefined;
        statusBarItem.text = 'Pomodoro: Stopped';
        vscode.window.showInformationMessage('Pomodoro stopped.');
    } else {
        vscode.window.showInformationMessage('No Pomodoro running.');
    }
}

function updateStatusBar() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    statusBarItem.text = `Pomodoro: ${timeString} ${isWorkSession ? '(Work)' : '(Break)'}`;
}

export function deactivate() {
    if (interval) {
        clearInterval(interval);
    }
}
