// Quote Builder functionality

let currentStepNumber = 1;
let quoteData = {
    clientName: '',
    travelDate: '',
    pax: { adults: 2, childWithBed: 0, childWithoutBed: 0, total: 2 },
    selectedPackage: null,
    options: [],
    finalQuote: null
};

let selectedHotelData = {
    optionIndex: 0,
    locationIndex: 0,
    location: ''
};

// Initialize quote builder
document.addEventListener('DOMContentLoaded', function() {
    checkAuthAndInitialize();
    bindEventListeners();
    loadPackageOptions();
    updatePaxSummary();
});

function checkAuthAndInitialize() {
    currentUser = getCurrentUser();
    
    if (!currentUser || currentUser.status !== 'approved') {
        window.location.href = 'dashboard.html';
        return;
    }
}

function bindEventListeners() {
    // Pax input listeners
    ['adults', 'childWithBed', 'childWithoutBed'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePaxSummary);
    });
    
    // Basic info listeners
    document.getElementById('clientName').addEventListener('input', updateQuoteData);
    document.getElementById('travelDate').addEventListener('input', updateQuoteData);
}

function updatePaxSummary() {
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const childWithBed = parseInt(document.getElementById('childWithBed').value) || 0;
    const childWithoutBed = parseInt(document.getElementById('childWithoutBed').value) || 0;
    
    const total = adults + childWithBed + childWithoutBed;
    const roomCalc = calculateRooms(adults, childWithBed, childWithoutBed);
    const vehicle = selectVehicle(total);
    
    document.getElementById('totalPax').textContent = total;
    document.getElementById('estimatedRooms').textContent = roomCalc.rooms;
    document.getElementById('recommendedVehicle').textContent = `${vehicle.type} (${vehicle.capacity} seater)`;
    
    // Update quote data
    quoteData.pax = { adults, childWithBed, childWithoutBed, total };
}

function updateQuoteData() {
    quoteData.clientName = document.getElementById('clientName').value;
    quoteData.travelDate = document.getElementById('travelDate').value;
}

function loadPackageOptions() {
    const container = document.getElementById('packageOptions');
    
    container.innerHTML = packages.map(pkg => `
        <div class="option-card p-6 rounded-lg cursor-pointer" onclick="selectPackage('${pkg.id}')">
            <h3 class="text-lg font-semibold mb-3">${pkg.name}</h3>
            <div class="space-y-2 mb-4">
                <p class="text-sm text-gray-600"><i class="fas fa-calendar mr-2"></i>${pkg.duration} days</p>
                <p class="text-sm text-gray-600"><i class="fas fa-map-marker-alt mr-2"></i>${pkg.locations.join(' → ')}</p>
                <p class="text-sm text-gray-600"><i class="fas fa-bed mr-2"></i>${pkg.nights.join('-')} nights</p>
            </div>
            <div class="mb-4">
                <h4 class="font-medium mb-2">Inclusions:</h4>
                <ul class="text-sm text-gray-600 space-y-1">
                    ${pkg.inclusions.map(inc => `<li>• ${inc}</li>`).join('')}
                </ul>
            </div>
            <div class="text-right">
                <p class="text-lg font-bold text-blue-600">From $${pkg.basePrice}/person</p>
            </div>
        </div>
    `).join('');
}

function selectPackage(packageId) {
    // Remove previous selection
    document.querySelectorAll('#packageOptions .option-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked card
    event.target.closest('.option-card').classList.add('selected');
    
    quoteData.selectedPackage = packages.find(pkg => pkg.id === packageId);
}

function nextStep() {
    if (!validateCurrentStep()) return;
    
    if (currentStepNumber < 5) {
        currentStepNumber++;
        updateStepDisplay();
        loadStepContent();
    }
}

function previousStep() {
    if (currentStepNumber > 1) {
        currentStepNumber--;
        updateStepDisplay();
        loadStepContent();
    }
}

function validateCurrentStep() {
    switch (currentStepNumber) {
        case 1:
            if (!quoteData.clientName || !quoteData.travelDate || quoteData.pax.total === 0) {
                alert('Please fill in all required fields');
                return false;
            }
            break;
        case 2:
            if (!quoteData.selectedPackage) {
                alert('Please select a package');
                return false;
            }
            break;
        case 3:
            if (quoteData.options.length === 0) {
                alert('Please create at least one quote option');
                return false;
            }
            break;
        case 4:
            // Validate markup is set for all options
            if (quoteData.options.some(opt => opt.markup === undefined)) {
                alert('Please set markup for all options');
                return false;
            }
            break;
    }
    return true;
}

function updateStepDisplay() {
    // Update step indicators
    for (let i = 1; i <= 5; i++) {
        const stepEl = document.getElementById(`step${i}`);
        if (i < currentStepNumber) {
            stepEl.className = 'step-completed w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold';
        } else if (i === currentStepNumber) {
            stepEl.className = 'step-active w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold';
        } else {
            stepEl.className = 'step-inactive w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold';
        }
    }
    
    // Update step content visibility
    for (let i = 1; i <= 5; i++) {
        const contentEl = document.getElementById(`stepContent${i}`);
        if (i === currentStepNumber) {
            contentEl.classList.remove('hidden');
        } else {
            contentEl.classList.add('hidden');
        }
    }
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (currentStepNumber === 1) {
        prevBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
    }
    
    if (currentStepNumber === 5) {
        nextBtn.classList.add('hidden');
    } else {
        nextBtn.classList.remove('hidden');
    }
    
    // Update step title and number
    const stepTitles = {
        1: 'Basic Information',
        2: 'Package Selection',
        3: 'Quote Options',
        4: 'Markup & Pricing',
        5: 'Preview & Generate'
    };
    
    document.getElementById('currentStep').textContent = currentStepNumber;
    document.getElementById('stepTitle').textContent = stepTitles[currentStepNumber];
}

function loadStepContent() {
    switch (currentStepNumber) {
        case 3:
            loadQuoteOptionsStep();
            break;
        case 4:
            loadMarkupStep();
            break;
        case 5:
            loadPreviewStep();
            break;
    }
}

function loadQuoteOptionsStep() {
    if (quoteData.options.length === 0) {
        addQuoteOption();
    }
}

function addQuoteOption() {
    if (quoteData.options.length >= 3) {
        alert('Maximum 3 options allowed');
        return;
    }
    
    const optionIndex = quoteData.options.length;
    const option = {
        name: `Option ${optionIndex + 1}`,
        hotels: [],
        addOns: [],
        markup: 0,
        markupType: 'flat' // 'flat' or 'percentage'
    };
    
    // Initialize hotels for each location
    quoteData.selectedPackage.locations.forEach((location, index) => {
        option.hotels.push({
            location: location,
            hotel: hotels[location][0], // Default to first hotel
            nights: quoteData.selectedPackage.nights[index]
        });
    });
    
    quoteData.options.push(option);
    renderQuoteOptions();
}

function renderQuoteOptions() {
    const container = document.getElementById('quoteOptions');
    
    container.innerHTML = quoteData.options.map((option, index) => `
        <div class="border rounded-lg p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">${option.name}</h3>
                <button onclick="removeQuoteOption(${index})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                    <h4 class="font-medium mb-3">Hotels & Accommodation</h4>
                    <div class="space-y-3">
                        ${option.hotels.map((hotelData, hotelIndex) => `
                            <div class="border rounded p-3">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-medium">${hotelData.location}</span>
                                    <span class="text-sm text-gray-600">${hotelData.nights} nights</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <div>
                                        <p class="text-sm font-medium">${hotelData.hotel.name}</p>
                                        <p class="text-xs text-gray-600">${hotelData.hotel.category} - $${hotelData.hotel.pricePerNight}/night</p>
                                    </div>
                                    <button onclick="selectHotel(${index}, ${hotelIndex}, '${hotelData.location}')" class="text-blue-600 hover:text-blue-800 text-sm">
                                        Change
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <h4 class="font-medium mb-3">Add-ons</h4>
                    <div class="space-y-2">
                        ${addOns.map(addOn => `
                            <label class="flex items-center">
                                <input type="checkbox" 
                                       onchange="toggleAddOn(${index}, '${addOn.id}')" 
                                       ${option.addOns.find(a => a.id === addOn.id) ? 'checked' : ''}
                                       class="mr-2">
                                <span class="text-sm">${addOn.name} (+$${addOn.price})</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded">
                <h4 class="font-medium mb-2">Estimated Cost</h4>
                <p class="text-sm text-gray-600">Base cost: $${calculateBaseCost(option)}</p>
                <p class="text-sm text-gray-600">Per person: $${(calculateBaseCost(option) / quoteData.pax.total).toFixed(2)}</p>
            </div>
        </div>
    `).join('');
}

function selectHotel(optionIndex, hotelIndex, location) {
    selectedHotelData = { optionIndex, locationIndex: hotelIndex, location };
    
    document.getElementById('modalLocation').textContent = location;
    
    const hotelOptions = document.getElementById('hotelOptions');
    hotelOptions.innerHTML = hotels[location].map((hotel, index) => `
        <div class="hotel-card p-4 rounded-lg cursor-pointer" onclick="selectHotelOption(${index})">
            <h4 class="font-semibold mb-2">${hotel.name}</h4>
            <p class="text-sm text-gray-600 mb-2">${hotel.category}</p>
            <p class="text-lg font-bold text-blue-600">$${hotel.pricePerNight}/night</p>
        </div>
    `).join('');
    
    document.getElementById('hotelModal').classList.remove('hidden');
}

function selectHotelOption(hotelIndex) {
    // Remove previous selection
    document.querySelectorAll('.hotel-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked card
    event.target.closest('.hotel-card').classList.add('selected');
    
    selectedHotelData.selectedHotel = hotels[selectedHotelData.location][hotelIndex];
}

function confirmHotelSelection() {
    if (!selectedHotelData.selectedHotel) {
        alert('Please select a hotel');
        return;
    }
    
    quoteData.options[selectedHotelData.optionIndex].hotels[selectedHotelData.locationIndex].hotel = selectedHotelData.selectedHotel;
    
    closeHotelModal();
    renderQuoteOptions();
}

function closeHotelModal() {
    document.getElementById('hotelModal').classList.add('hidden');
    selectedHotelData = { optionIndex: 0, locationIndex: 0, location: '' };
}

function toggleAddOn(optionIndex, addOnId) {
    const option = quoteData.options[optionIndex];
    const addOn = addOns.find(a => a.id === addOnId);
    const existingIndex = option.addOns.findIndex(a => a.id === addOnId);
    
    if (existingIndex >= 0) {
        option.addOns.splice(existingIndex, 1);
    } else {
        option.addOns.push(addOn);
    }
    
    renderQuoteOptions();
}

function removeQuoteOption(index) {
    if (quoteData.options.length <= 1) {
        alert('At least one option is required');
        return;
    }
    
    quoteData.options.splice(index, 1);
    renderQuoteOptions();
}

function calculateBaseCost(option) {
    let cost = 0;
    
    // Base package cost
    cost += quoteData.selectedPackage.basePrice * quoteData.pax.total;
    
    // Hotel costs
    option.hotels.forEach(hotelData => {
        const roomCalc = calculateRooms(quoteData.pax.adults, quoteData.pax.childWithBed, quoteData.pax.childWithoutBed);
        cost += hotelData.hotel.pricePerNight * hotelData.nights * roomCalc.rooms;
    });
    
    // Vehicle cost
    const vehicle = selectVehicle(quoteData.pax.total);
    cost += vehicle.pricePerDay * quoteData.selectedPackage.duration;
    
    // Add-ons
    option.addOns.forEach(addOn => {
        cost += addOn.price * quoteData.pax.total;
    });
    
    return cost;
}

function loadMarkupStep() {
    const container = document.getElementById('markupOptions');
    
    container.innerHTML = quoteData.options.map((option, index) => {
        const baseCost = calculateBaseCost(option);
        const tierDiscount = (tiers[currentUser.tier].discount * quoteData.pax.total);
        const discountedCost = baseCost - tierDiscount;
        
        return `
            <div class="border rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4">${option.name}</h3>
                
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-medium mb-3">Cost Breakdown</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span>Base Cost:</span>
                                <span>$${baseCost.toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between text-green-600">
                                <span>${currentUser.tier} Tier Discount:</span>
                                <span>-$${tierDiscount.toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between font-semibold border-t pt-2">
                                <span>Discounted Cost:</span>
                                <span>$${discountedCost.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-medium mb-3">Add Your Markup</h4>
                        <div class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium mb-1">Markup Type</label>
                                <select onchange="updateMarkupType(${index}, this.value)" class="w-full px-3 py-2 border rounded-lg">
                                    <option value="flat" ${option.markupType === 'flat' ? 'selected' : ''}>Flat Amount ($)</option>
                                    <option value="percentage" ${option.markupType === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Markup Value</label>
                                <input type="number" 
                                       value="${option.markup || 0}" 
                                       onchange="updateMarkup(${index}, this.value)"
                                       class="w-full px-3 py-2 border rounded-lg" 
                                       placeholder="Enter markup">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4 bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-blue-800 mb-2">Final Pricing</h4>
                    <div class="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p class="text-blue-700">Total Price: <span class="font-bold">$${calculateFinalPrice(option, discountedCost).toFixed(2)}</span></p>
                        </div>
                        <div>
                            <p class="text-blue-700">Per Person: <span class="font-bold">$${(calculateFinalPrice(option, discountedCost) / quoteData.pax.total).toFixed(2)}</span></p>
                        </div>
                        <div>
                            <p class="text-blue-700">Your Profit: <span class="font-bold">$${calculateProfit(option, discountedCost).toFixed(2)}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateMarkupType(optionIndex, type) {
    quoteData.options[optionIndex].markupType = type;
    quoteData.options[optionIndex].markup = 0; // Reset markup when type changes
    loadMarkupStep();
}

function updateMarkup(optionIndex, value) {
    quoteData.options[optionIndex].markup = parseFloat(value) || 0;
    loadMarkupStep();
}

function calculateFinalPrice(option, discountedCost) {
    if (option.markupType === 'percentage') {
        return discountedCost * (1 + (option.markup / 100));
    } else {
        return discountedCost + option.markup;
    }
}

function calculateProfit(option, discountedCost) {
    const finalPrice = calculateFinalPrice(option, discountedCost);
    return finalPrice - discountedCost;
}

function loadPreviewStep() {
    const container = document.getElementById('quotePreview');
    
    // Generate final quote data
    quoteData.finalQuote = {
        id: generateId(),
        agentId: currentUser.id,
        clientName: quoteData.clientName,
        travelDate: quoteData.travelDate,
        pax: quoteData.pax,
        package: quoteData.selectedPackage,
        options: quoteData.options.map(option => {
            const baseCost = calculateBaseCost(option);
            const tierDiscount = (tiers[currentUser.tier].discount * quoteData.pax.total);
            const discountedCost = baseCost - tierDiscount;
            const finalPrice = calculateFinalPrice(option, discountedCost);
            
            return {
                ...option,
                baseCost,
                tierDiscount,
                discountedCost,
                finalPrice,
                pricePerPerson: finalPrice / quoteData.pax.total
            };
        }),
        createdAt: new Date().toISOString(),
        status: 'draft'
    };
    
    container.innerHTML = `
        <div class="bg-white border rounded-lg p-6">
            <div class="text-center mb-6">
                <h3 class="text-2xl font-bold">Bali Travel Quote</h3>
                <p class="text-gray-600">Prepared by ${currentUser.contactPerson}</p>
                <p class="text-gray-600">${currentUser.companyName || 'Independent Agent'}</p>
            </div>
            
            <div class="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h4 class="font-semibold mb-2">Client Information</h4>
                    <p>Name: ${quoteData.clientName}</p>
                    <p>Travel Date: ${new Date(quoteData.travelDate).toLocaleDateString()}</p>
                    <p>Passengers: ${quoteData.pax.adults} Adults, ${quoteData.pax.childWithBed} Child w/bed, ${quoteData.pax.childWithoutBed} Child w/o bed</p>
                </div>
                <div>
                    <h4 class="font-semibold mb-2">Package Details</h4>
                    <p>Package: ${quoteData.selectedPackage.name}</p>
                    <p>Duration: ${quoteData.selectedPackage.duration} days</p>
                    <p>Locations: ${quoteData.selectedPackage.locations.join(' → ')}</p>
                </div>
            </div>
            
            ${quoteData.finalQuote.options.map((option, index) => `
                <div class="border rounded-lg p-4 mb-4">
                    <h4 class="text-lg font-semibold mb-3">${option.name}</h4>
                    
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <h5 class="font-medium mb-2">Accommodation</h5>
                            ${option.hotels.map(hotel => `
                                <p class="text-sm">• ${hotel.location}: ${hotel.hotel.name} (${hotel.nights} nights)</p>
                            `).join('')}
                        </div>
                        <div>
                            <h5 class="font-medium mb-2">Add-ons</h5>
                            ${option.addOns.length > 0 ? 
                                option.addOns.map(addOn => `<p class="text-sm">• ${addOn.name}</p>`).join('') :
                                '<p class="text-sm text-gray-500">No add-ons selected</p>'
                            }
                        </div>
                    </div>
                    
                    <div class="bg-blue-50 p-3 rounded text-center">
                        <p class="text-lg font-bold text-blue-800">Total: $${option.finalPrice.toFixed(2)}</p>
                        <p class="text-sm text-blue-600">Per person: $${option.pricePerPerson.toFixed(2)}</p>
                    </div>
                </div>
            `).join('')}
            
            <div class="text-center text-sm text-gray-600 mt-6">
                <p>Contact: ${currentUser.email} | ${currentUser.whatsapp}</p>
                <p>Terms and conditions apply. Valid for 7 days from quote date.</p>
            </div>
        </div>
    `;
}

function saveDraft() {
    if (!quoteData.clientName) {
        alert('Please enter client name before saving');
        return;
    }
    
    const draft = {
        ...quoteData,
        id: generateId(),
        agentId: currentUser.id,
        status: 'draft',
        createdAt: new Date().toISOString()
    };
    
    quotes.push(draft);
    saveData();
    
    alert('Draft saved successfully!');
}

function downloadPDF() {
    if (!quoteData.finalQuote) {
        alert('Please complete all steps first');
        return;
    }
    
    // Save the quote
    quotes.push(quoteData.finalQuote);
    
    // Update agent stats
    const agentIndex = agents.findIndex(a => a.id === currentUser.id);
    agents[agentIndex].quotesGenerated++;
    
    saveData();
    
    // Generate PDF (simplified for demo)
    generatePDF(quoteData.finalQuote);
    
    alert('Quote saved and PDF downloaded!');
}

function sendToEmail() {
    if (!quoteData.finalQuote) {
        alert('Please complete all steps first');
        return;
    }
    
    // In a real implementation, this would send an email
    alert(`Quote will be sent to ${currentUser.email}`);
    
    // Save the quote
    quotes.push(quoteData.finalQuote);
    saveData();
}

function sendToWhatsApp() {
    if (!quoteData.finalQuote) {
        alert('Please complete all steps first');
        return;
    }
    
    // Create WhatsApp message
    const message = `New Bali Quote for ${quoteData.clientName}\n\nPackage: ${quoteData.selectedPackage.name}\nTravel Date: ${quoteData.travelDate}\nPax: ${quoteData.pax.total}\n\nOptions: ${quoteData.finalQuote.options.length}\nStarting from: $${Math.min(...quoteData.finalQuote.options.map(o => o.finalPrice)).toFixed(2)}\n\nPrepared by ${currentUser.contactPerson}`;
    
    const whatsappUrl = `https://wa.me/${currentUser.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    // Save the quote
    quotes.push(quoteData.finalQuote);
    saveData();
}