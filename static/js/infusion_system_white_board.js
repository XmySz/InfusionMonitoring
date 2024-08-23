let patientCount = 1;
let modalData = {};   // 全局对象，用于存储每个模态窗口的响应数据里表格相关的部分
let patientData = {};
let deviceStatuses = {};


function addCard(patient) {
    const content = document.querySelector('.content');
    const addCard = document.querySelector('.add-card');

    patientCount++;

    const cardId = patient.cardId;

    // 创建新卡片
    const newCard = document.createElement('div');
    newCard.className = 'card';
    newCard.id = cardId;
    newCard.innerHTML = `
        <div class="liquid-overlay"></div>
        <div class="card-content">
            <b>患者信息：</b><br>
            <span class="patient-info">${patient.name} ${patient.gender}</span><br>
            <span class="department-bedNo">${patient.department} ${patient.bedNum}床</span><br>
            <span class="usage">${patient.usage}</span><br>
            开始时间: <span class="start-time">${patient.startTime}</span>
            <p class="liquid-info">
                估计液体余量: <span class="liquid-amount">${patient.residualLiquid}</span>
            </p>
        </div>
    `;

    content.insertBefore(newCard, addCard);

    setTimeout(() => {
        newCard.classList.remove('new-card');
    }, 500);

    patientData[cardId] = patient;
}

function showCompletionMessage(card) {
    const message = document.createElement('div');
    message.className = 'completion-message';
    message.textContent = '输液完成！';
    card.appendChild(message);

    setTimeout(() => {
        message.style.opacity = '0.95';
        message.style.zIndex = '1002';
    }, 50);
}

function completeInfusion(modalId) {
    const modalElement = document.getElementById(modalId);
    const patientID = modalElement.querySelector('.patientID').value;
    const selectedRecordSn = modalData[modalId]['selectedRecordSn'];

    // 调用 API 更新 ZyRecord
    fetch('/api/update_zyrecord/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            record_sn: selectedRecordSn,
            p_id: patientID
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('ZyRecord 更新成功:', data.message);
            } else {
                console.error('SyRecord 更新失败:', data.message);
            }
        })
        .catch(error => {
            console.error('更新 SyRecord 时发生错误:', error);
        });
}

function showLockOverlay(cardId, modalId) {
    const card = document.getElementById(cardId);
    const lockOverlay = document.createElement('div');
    lockOverlay.className = 'lock-overlay';
    lockOverlay.innerHTML = `
        <div class="lock-message">锁已关上</div>
        <div class="lock-buttons">
            <button class="continue-infusion">继续输液</button>
            <button class="complete-infusion">输液完成</button>
        </div>
    `;
    card.appendChild(lockOverlay);

    // 添加按钮事件监听器
    lockOverlay.querySelector('.continue-infusion').addEventListener('click', () => {
        continueLockInfusion(cardId, modalId);
    });
    lockOverlay.querySelector('.complete-infusion').addEventListener('click', () => {
        completeLockInfusion(cardId, modalId);
    });
}

function continueLockInfusion(cardId, modalId) {
    // 移除锁定覆盖层
    const lockOverlay = document.querySelector(`#${cardId} .lock-overlay`);
    if (lockOverlay) {
        lockOverlay.remove();
    }

    // 继续输液逻辑
    deviceStatuses[modalId].lockSwitch = "正在监控...";
    startDeviceMonitoring(modalId);

    // 重新启动输液模拟
    let card = document.getElementById(cardId)
    const dropRate = card.querySelector('.drop-rate').textContent;
    const initialDosage = Math.max(...modalData[modalId].medicineData.map(medicine => medicine.dosage));;
    const currentPercentage = parseFloat(card.querySelector('.liquid-overlay').style.height) / 100;
    const currentDosage = initialDosage * (1 - currentPercentage);

    // 重新启动输液模拟
    simulateRealTimeUpdate(cardId, currentDosage, modalId, parseFloat(dropRate));
}

function completeLockInfusion(cardId, modalId) {
    // 移除锁定覆盖层
    const lockOverlay = document.querySelector(`#${cardId} .lock-overlay`);
    if (lockOverlay) {
        lockOverlay.remove();
    }

    document.getElementById(cardId).querySelector('.liquid-overlay').style.height = '%0'

    // 显示输液完成消息
    showCompletionMessage(document.getElementById(cardId));

    // 完成输液逻辑
    completeInfusion(modalId);


}

// 025B37A41E9F 360906

function fetchPatientData() {
    return fetch('/api/patient_infusion_info/')
        .then(response => response.json())
        .catch(error => console.error('Error fetching patient data:', error));
}

function updateCard(patient) {
    const cardId = patient.cardId;
    const card = document.getElementById(cardId);
    if (card) {
        card.querySelector('.patient-info').textContent = `${patient.name} ${patient.gender}`;
        card.querySelector('.department-bedNo').textContent = `${patient.department} ${patient.bedNum}床`;
        card.querySelector('.usage').textContent = patient.usage;
        card.querySelector('.start-time').textContent = patient.startTime;
        card.querySelector('.liquid-amount').textContent = patient.residualLiquid;

        // 更新液体高度
        const liquidOverlay = card.querySelector('.liquid-overlay');
        const liquidPercentage = (patient.residualLiquid / patient.liquidHeight) * 100;
        liquidOverlay.style.height = `${100 - liquidPercentage}%`;

        // 更新存储的患者数据
        patientData[cardId] = patient;
    }
}

function updatePatientInfos() {
    fetchPatientData().then(patients => {
        patients.forEach(patient => {
            const cardId = patient.cardId;
            if (document.getElementById(cardId)) {
                updateCard(patient);
            } else {
                addCard(patient);
            }
        });
    });
}

// 初始加载
updatePatientInfos();

// 每秒更新一次
setInterval(updatePatientInfos, 1000);