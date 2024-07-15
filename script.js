let productData = {};

window.onload = function() {
    loadProductData();
};

function loadProductData() {
    fetch('products.json')
        .then(response => response.json())
        .then(data => {
            productData = data;
        })
        .catch(error => {
            console.error('Error loading product data:', error);
        });
}

function addRow(rowData = {}) {
    const table = document.getElementById("pricingTable").getElementsByTagName('tbody')[0];
    const newRow = document.createElement('tr');

    newRow.innerHTML = `
        <td data-label="产品类别"><select onchange="updateProductNames(this.parentNode.parentNode)"><option value="">选择产品类型</option>${Object.keys(productData).map(type => `<option value="${type}">${type}</option>`).join('')}</select></td>
        <td data-label="产品名称"><select onchange="updateProductModels(this.parentNode.parentNode)"><option value="">选择产品名称</option></select></td>
        <td data-label="型号"><select onchange="updateUnitPrice(this.parentNode.parentNode)"><option value="">选择型号</option></select></td>
        <td data-label="数量"><input type="number" value="${rowData['quantity'] || ''}" oninput="calculateTotal()"></td>
        <td data-label="单价"><input type="text" value="${rowData['unit_price'] || ''}" readonly></td>
        <td data-label="成本总价"><input type="text" value="" readonly></td>
        <td data-label="EXW单价（USD）"><input type="text" value="" readonly></td>
        <td data-label="取整报价"><input type="text" value="" readonly></td>
        <td data-label="利润率（%）"><input type="text" value="" oninput="calculateTotal()"></td>
        <td data-label="EXW售价"><input type="text" value="" readonly></td>
        <td><button class="delete-btn" onclick="deleteRow(this)">X</button></td>
    `;

    table.appendChild(newRow);

    if (rowData['category']) {
        updateProductNames(newRow, rowData['category'], rowData['name'], rowData['model']);
    }
}

function deleteRow(button) {
    const row = button.parentNode.parentNode;
    row.parentNode.removeChild(row);
    calculateTotal();
}

function updateProductNames(row, category = '', name = '', model = '') {
    const typeSelect = row.cells[0].getElementsByTagName('select')[0];
    const nameSelect = row.cells[1].getElementsByTagName('select')[0];
    const modelSelect = row.cells[2].getElementsByTagName('select')[0];

    nameSelect.innerHTML = '<option value="">选择产品名称</option>';
    modelSelect.innerHTML = '<option value="">选择型号</option>';

    const selectedType = typeSelect.value;

    if (selectedType && productData[selectedType]) {
        for (let productName in productData[selectedType]) {
            const option = document.createElement('option');
            option.value = productName;
            option.textContent = productName;
            nameSelect.appendChild(option);
        }
        if (category && name && model) {
            nameSelect.value = name;
            updateProductModels(row, category, name, model);
        }
    }
}

function updateProductModels(row, category = '', name = '', model = '') {
    const typeSelect = row.cells[0].getElementsByTagName('select')[0];
    const nameSelect = row.cells[1].getElementsByTagName('select')[0];
    const modelSelect = row.cells[2].getElementsByTagName('select')[0];

    modelSelect.innerHTML = '<option value="">选择型号</option>';

    const selectedType = typeSelect.value;
    const selectedName = nameSelect.value;

    if (selectedType && selectedName && productData[selectedType][selectedName]) {
        const models = productData[selectedType][selectedName]['models'];
        models.forEach((model) => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
        if (category && name && model) {
            modelSelect.value = model;
            updateUnitPrice(row, category, name, model);
        }
    }
}

function updateUnitPrice(row, category = '', name = '', model = '') {
    const typeSelect = row.cells[0].getElementsByTagName('select')[0];
    const nameSelect = row.cells[1].getElementsByTagName('select')[0];
    const modelSelect = row.cells[2].getElementsByTagName('select')[0];
    const unitPriceInput = row.cells[4].getElementsByTagName('input')[0];

    const selectedType = typeSelect.value;
    const selectedName = nameSelect.value;
    const selectedModel = modelSelect.value;

    if (selectedType && selectedName && selectedModel && productData[selectedType][selectedName]) {
        const unitPrice = productData[selectedType][selectedName]['prices'][selectedModel];
        unitPriceInput.value = unitPrice;
        calculateTotal();
    }
}

function calculateTotal() {
    const table = document.getElementById("pricingTable").getElementsByTagName('tbody')[0];
    const exchangeRate = parseFloat(document.getElementById("exchangeRate").value) || 0;
    const domesticFreight = parseFloat(document.getElementById("domesticFreight").value) || 0;
    const seaFreight = parseFloat(document.getElementById("seaFreight").value) || 0;

    let totalFOB = 0;
    let totalCostRMB = 0; // 初始化总成本（RMB）

    for (let row of table.rows) {
        const quantity = parseFloat(row.cells[3].getElementsByTagName('input')[0].value) || 0;
        const unitPrice = parseFloat(row.cells[4].getElementsByTagName('input')[0].value) || 0;
        const costTotal = unitPrice * quantity;
        row.cells[5].getElementsByTagName('input')[0].value = costTotal.toFixed(2);

        const exwUnitPrice = unitPrice / exchangeRate;
        row.cells[6].getElementsByTagName('input')[0].value = exwUnitPrice.toFixed(2);

        const roundedPrice = Math.ceil(exwUnitPrice);
        row.cells[7].getElementsByTagName('input')[0].value = roundedPrice.toFixed(2);

        const profitRate = parseFloat(row.cells[8].getElementsByTagName('input')[0].value) || 0;

        const exwSalePrice = roundedPrice * (1 + profitRate / 100) * quantity;
        row.cells[9].getElementsByTagName('input')[0].value = exwSalePrice.toFixed(2);

        totalFOB += exwSalePrice;
        totalCostRMB += costTotal; // 累加成本总价到总成本（RMB）
    }

    const totalFOBPrice = totalFOB + Math.round(domesticFreight / exchangeRate);
    document.getElementById("totalFOBPrice").value = totalFOBPrice.toFixed(2);

    const totalCIFPrice = totalFOBPrice + seaFreight;
    document.getElementById("totalCIFPrice").value = totalCIFPrice.toFixed(2);

    const rmbPrice = totalCIFPrice * exchangeRate;
    document.getElementById("rmbPrice").value = rmbPrice.toFixed(2);

    document.getElementById("totalCostRMB").value = (totalCostRMB + domesticFreight + (seaFreight * exchangeRate)).toFixed(2); // 更新总成本（RMB）

    const profit = rmbPrice - (totalCostRMB + domesticFreight + (seaFreight * exchangeRate)); // 计算利润
    document.getElementById("profit").value = profit.toFixed(2);
}

// 账户信息存储
const accounts = {
    Kevin: '123',
    Ivy: '456',
    Paris: '789',
    // 添加更多账户
};

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // 验证用户名和密码
    if (accounts[username] && accounts[username] === password) {
        document.querySelector('.login-container').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    } else {
        alert('用户名或密码错误');
    }
});
