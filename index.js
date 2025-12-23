import { chat, eventSource, event_types, extractMessageBias, messageFormatting, saveChatConditional } from '../../../../script.js';

const getMessageTimeStamp = () => new Date().toISOString();
const log = (msg) => console.log(`[UserSwipes] ${msg}`);

// Step 1: Inject wrapper containers
const injectQuickActionsWrapper = () => {
    const template = document.querySelector('#message_template > .mes');
    if (!template) {
        log('Message template not found');
        return [null, null];
    }

    const elTop = template.querySelector('.name_text')?.parentElement;
    const elBottom = template;

    let wrapTop = elTop?.querySelector('.stus--quickActions');
    let wrapBottom = elBottom.querySelector(':scope > .stus--quickActions');

    if (!wrapTop && elTop) {
        wrapTop = document.createElement('div');
        wrapTop.classList.add('stus--quickActions');
        wrapTop.setAttribute('data-stus--anchor', 'top');
        elTop.append(wrapTop);
    }

    if (!wrapBottom) {
        wrapBottom = document.createElement('div');
        wrapBottom.classList.add('stus--quickActions');
        wrapBottom.setAttribute('data-stus--anchor', 'bottom');
        elBottom.append(wrapBottom);
    }

    // Clone to existing messages
    for (const mes of document.querySelectorAll('#chat .mes:not(.stus--has-actions)')) {
        mes.classList.add('stus--has-actions');

        const nameArea = mes.querySelector('.name_text')?.parentElement;
        if (nameArea && wrapTop) {
            const existingTop = nameArea.querySelector('.stus--quickActions[data-stus--anchor="top"]');
            if (!existingTop) {
                nameArea.append(wrapTop.cloneNode(true));
            }
        }

        const existingBottom = mes.querySelector(':scope > .stus--quickActions[data-stus--anchor="bottom"]');
        if (!existingBottom && wrapBottom) {
            mes.append(wrapBottom.cloneNode(true));
        }
    }

    return [wrapTop, wrapBottom];
};

// Step 2: Build our swipe controls
const buildSwipeControls = (anchor) => {
    const container = document.createElement('div');
    container.classList.add('stus--controls');
    container.setAttribute('data-stus', anchor);

    const leftBtn = document.createElement('span');
    leftBtn.classList.add('stus--swipe-left', 'stus--action', 'fa-solid', 'fa-chevron-left');
    leftBtn.title = 'Previous swipe';
    container.append(leftBtn);

    const counter = document.createElement('span');
    counter.classList.add('stus--counter');
    counter.textContent = '1/1';
    container.append(counter);

    const rightBtn = document.createElement('span');
    rightBtn.classList.add('stus--swipe-right', 'stus--action', 'fa-solid', 'fa-chevron-right');
    rightBtn.title = 'Next swipe';
    container.append(rightBtn);

    return container;
};

// Step 3: Check if message should have manual swipes
const shouldHaveManualSwipes = (mesDom) => {
    const isUser = mesDom.getAttribute('is_user') === 'true';
    const isSystem = mesDom.getAttribute('is_system') === 'true';

    // NEW: Check if it's a hidden/ghost message (any type)
    const isGhost = mesDom.querySelector('.mes_ghost')?.style.display !== 'none'
                    || mesDom.classList.contains('mes_ghost');

    // Enable for: user messages, system messages, OR ghost/hidden messages
    return isUser || isSystem || isGhost;
};

// Step 4: Activate swipe functionality for a message
const activateSwipes = (mesDom) => {
    if (!mesDom) return;

    const mesId = mesDom.getAttribute('mesid');

    // Use our new check function
    if (!shouldHaveManualSwipes(mesDom)) return;

    // Check if already activated
    if (mesDom.dataset.stusActivated) return;
    mesDom.dataset.stusActivated = 'true';

    const getMes = () => chat[mesId];
    if (!getMes()) return;

    // Find our injection point
    const bottomActions = mesDom.querySelector('.stus--quickActions[data-stus--anchor="bottom"]');
    if (!bottomActions) {
        log(`No action container found for message ${mesId}`);
        return;
    }

    // Check if our controls already exist, if not add them
    let controls = bottomActions.querySelector('.stus--controls');
    if (!controls) {
        controls = buildSwipeControls('bottom');
        bottomActions.append(controls);
    }

    const leftBtn = controls.querySelector('.stus--swipe-left');
    const rightBtn = controls.querySelector('.stus--swipe-right');
    const counter = controls.querySelector('.stus--counter');

    const updateCounter = () => {
        const mes = getMes();
        if (!mes) return;
        counter.textContent = `${(mes.swipe_id ?? 0) + 1}/${mes.swipes?.length ?? 1}`;
    };

    // LEFT button handler
    leftBtn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        log('Left swipe clicked');

        const mes = getMes();
        if (!mes) return;

        if (mes.swipe_id === null || mes.swipe_id === undefined) mes.swipe_id = 0;
        if (!mes.swipes) mes.swipes = [mes.mes];

        if (mes.swipe_id > 0) {
            mes.swipe_id--;
            mes.mes = mes.swipes[mes.swipe_id];

            const textDiv = mesDom.querySelector('.mes_text');
            if (textDiv) {
                textDiv.innerHTML = messageFormatting(
                    mes.mes, mes.name, mes.is_system, mes.is_user, Number(mesId)
                );
            }
            updateCounter();
            saveChatConditional();
        }
    });

    // RIGHT button handler
    rightBtn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        log('Right swipe clicked');

        const mes = getMes();
        if (!mes) return;

        let requestEdit = false;

        if (mes.swipe_id === null || mes.swipe_id === undefined) mes.swipe_id = 0;
        if (!mes.swipes) mes.swipes = [mes.mes];
        if (!mes.swipe_info) {
            mes.swipe_info = [{
                send_date: mes.send_date,
                gen_started: mes.gen_started,
                gen_finished: mes.gen_finished,
                extra: JSON.parse(JSON.stringify(mes.extra || {})),
            }];
        }

        if (mes.swipe_id + 1 >= mes.swipes.length) {
            requestEdit = true;
            // Copy current message text
            mes.swipes.push(mes.mes);
            mes.swipe_info.push({
                send_date: getMessageTimeStamp(),
                gen_started: null,
                gen_finished: null,
                extra: {
                    bias: extractMessageBias ? extractMessageBias('') : null,
                    gen_id: Date.now(),
                    api: 'manual',
                    model: 'manual swipe',
                },
            });
        }

        mes.swipe_id++;
        mes.mes = mes.swipes[mes.swipe_id];

        const textDiv = mesDom.querySelector('.mes_text');
        if (textDiv) {
            textDiv.innerHTML = messageFormatting(
                mes.mes, mes.name, mes.is_system, mes.is_user, Number(mesId)
            );
        }
        updateCounter();

        if (requestEdit) {
            const editBtn = mesDom.querySelector('.mes_edit');
            if (editBtn) editBtn.click();
        } else {
            saveChatConditional();
        }
    });

    updateCounter();

    const messageType = mesDom.getAttribute('is_user') === 'true' ? 'user'
                      : mesDom.getAttribute('is_system') === 'true' ? 'system'
                      : 'ghost/hidden';
    log(`Activated swipes for ${messageType} message #${mesId}`);
};

// Step 5: Process all messages
const processMessages = () => {
    // Make sure wrappers exist
    injectQuickActionsWrapper();

    // Process ALL messages, then filter inside activateSwipes
    const messages = document.querySelectorAll('#chat .mes');
    messages.forEach(activateSwipes);
};

// Step 6: Initialize
const init = () => {
    log('UserSwipes v6.2 Loading (with Ghost Message support)');

    // Initial injection
    setTimeout(() => {
        injectQuickActionsWrapper();
        processMessages();
    }, 500);

    // Listen for changes
    eventSource.on(event_types.CHAT_CHANGED, () => {
        setTimeout(processMessages, 500);
    });

    eventSource.on(event_types.USER_MESSAGE_RENDERED, (mesId) => {
        setTimeout(() => {
            injectQuickActionsWrapper();
            activateSwipes(document.querySelector(`#chat .mes[mesid="${mesId}"]`));
        }, 100);
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (mesId) => {
        setTimeout(() => {
            injectQuickActionsWrapper();
            activateSwipes(document.querySelector(`#chat .mes[mesid="${mesId}"]`));
        }, 100);
    });
};

init();
