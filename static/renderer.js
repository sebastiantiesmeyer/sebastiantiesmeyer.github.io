var updatingPopup = false;

var venues = []

function addVenue(latitude, longitude, xValue, yValue, name, rgb, marker) {
    venues.push({ latitude: latitude, longitude: longitude, xValue: xValue, yValue: yValue, name: name, rgb: rgb, isVisibleMap: true, isVisiblePlot: true, marker: marker });
}

function addTopographicMap(divId, latitudeValues, longitudeValues, nameValues, rgbValues, isTag) {
    var map = L.map(divId).setView([52.5, 13.406], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var nTags = isTag.filter(value => value).length;

    // Create Leaflet markers
    for (var i = nTags; i < latitudeValues.length; i++) {
        var circle = L.circle([latitudeValues[i], longitudeValues[i]], {
            color: rgbValues[i],
            fillColor: rgbValues[i],
            fillOpacity: 0.7,
            radius: 100
        }).addTo(map).bindPopup(nameValues[i], { autoClose: false, closeOnClick: false });

        circle._index = i;  // Store index for reference
        addVenue(latitudeValues[i], longitudeValues[i], '', '', nameValues[i], rgbValues[i], circle);
    }

    // Add zoom and pan callbacks
    map.on('zoomend', function (eventData) {
        if (!updatingPopup) {
            updatingPopup = true;
            getVisibleMarkers(map, venues, eventData);
            updatingPopup = false;
        }
    });

    map.on('moveend', function (eventData) {
        if (!updatingPopup) {
            updatingPopup = true;
            getVisibleMarkers(map, venues, eventData);
            updatingPopup = false;
        }
    });

    // Function to get the visible markers based on the current map view
    function getVisibleMarkers(map, venues, eventData) {
        var bounds = map.getBounds();

        for (var i = 0; i < venues.length; i++) {
            var marker = venues[i].marker;

            var visibleData = [];
            // visibleData.push({ x: xData[i], y: yData[i] });

            if (bounds.contains(marker.getLatLng())) {
                venues[i].isVisibleMap = true;
            } else {
                venues[i].isVisibleMap = false;
            }
        }
        updatePlotlyMarkers();
        drawVenueCards(eventData);
    }
}

function addScatterPlot(divId, xValues, yValues, nameValues, rgbValues, isTag) {

    // Create a trace for the scatter plot
    var trace1 = {
        x: xValues.filter((item, index) => !isTag[index]),
        y: yValues.filter((item, index) => !isTag[index]),
        mode: 'markers',
        type: 'scatter',
        text: nameValues.filter((item, index) => !isTag[index]),
        marker: {
            color: rgbValues.filter((item, index) => !isTag[index]),
            size: 10
        }
    };

    textTrace = {
        x: xValues.filter((item, index) => isTag[index]),  // X coordinates for the data points
        y: yValues.filter((item, index) => isTag[index]),  // Y coordinates for the data points
        mode: 'text',  // Use both markers and text
        type: 'scatter',
        text: nameValues.filter((item, index) => isTag[index]),  // The text content for each data point
        textposition: 'top center',  // Position the text relative to the marker
        textfont: {
            family: 'Arial, sans-serif, bold',  // Font family for the text
            size: 22,  // Font size for the text
            color: 'rgb(17, 17, 17)'  // Font color for the text
        },
        // marker: {
        //     color: 'black',  // Customize marker color
        //     size: 10  // Customize marker size
        // }
    };

    var data = [trace1, textTrace];

    var layout = {
        xaxis: {
            title: '',
            showticks: false,
            showticklabels: false,
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: '',
            showticks: false,
            showticklabels: false,
            showgrid: true,
            zeroline: false
        },
        hovermode: 'closest',
        dragmode: 'pan',
        hoverdistance: 2,
        showlegend: false,
        margin: {
            l: 50,
            r: 50,
            t: 50,
            b: 50
        }
    };

    // Plot the scatter plot
    Plotly.newPlot(divId, data, layout, { scrollZoom: true });

    venues.forEach(venue => venue.plotlyMarker = { color: venue.rgb, opacity: 1 });

    document.getElementById(divId).on('plotly_relayout', function (eventData) {
        console.log('Plotly relayout event:', eventData);
        var xRange = [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']];
        var yRange = [eventData['yaxis.range[0]'], eventData['yaxis.range[1]']];

        console.log('Current x-axis range:', xRange);
        console.log('Current y-axis range:', yRange);

        // Update the markers visibility in Plotly
        getVisibleDataPoints(xRange, yRange);
        updatePlotlyMarkers();
        drawVenueCards(eventData);
    });

    function getVisibleDataPoints(xRange, yRange) {
        var xData = trace1.x;
        var yData = trace1.y;

        // console.log(xData.length, markers.length);

        for (var i = 0; i < xData.length; i++) {
            var isVisible = xData[i] >= xRange[0] && xData[i] <= xRange[1] && yData[i] >= yRange[0] && yData[i] <= yRange[1];
            if (isVisible) {
                // Keep visible markers normal in Plotly
                venues[i].isVisiblePlot = true;
                venues[i].marker.setStyle({ opacity: 1, fillOpacity: 0.7, color: rgbValues.filter((item, index) => !isTag[index])[i], fillColor: rgbValues.filter((item, index) => !isTag[index])[i] });
            } else {
                // Grey out non-visible markers in Plotly
                venues[i].isVisiblePlot = false;
                venues[i].marker.setStyle({ opacity: 0.2, fillOpacity: 0.1, color: 'grey', fillColor: 'grey' });
            }
        }


    }
}

function updatePlotlyMarkers() {
    var updatedMarkerColors = venues.map(marker => (marker.isVisibleMap & marker.isVisiblePlot) ? marker.rgb : 'grey');
    var updatedMarkerOpacities = venues.map(marker => (marker.isVisibleMap & marker.isVisiblePlot) ? 1 : 0.2);

    Plotly.restyle('scatter-plot', {
        'marker.color': [updatedMarkerColors],
        'marker.opacity': [updatedMarkerOpacities]
    });
}

function drawVenueCards(eventData = null) {

    // console.log(eventData);

    // if (!((eventData.type=="move") )){
    //     return;
    // }

    // get visibleData as all plotly markers that are not 'grey':
    var visibleData = venues.filter(venue => (venue.isVisibleMap & venue.isVisiblePlot));

    var venueCardContainer = document.getElementById('card-container');
    venueCardContainer.innerHTML = '';

    let nCards = 10;
    if (visibleData.length < 10) {
        nCards = visibleData.length;
    }

    venues.map(venue => venue.marker.closePopup())

    for (let i = 0; i < nCards; i++) {
        var venueCard = document.createElement('div');
        venueCard.className = 'card';
        // open 'https://www.google.com/search?q=" + visibleData[i].name + "';" on click:
        venueCard.onclick = function () { window.open('https://www.google.com/search?q=' + visibleData[i].name, '_blank'); };

        var venueCardBody = document.createElement('div');
        venueCardBody.className = 'card-body';

        var venueCardTitle = document.createElement('h5');
        venueCardTitle.className = 'card-title';
        // draw circle with the color visibleData[i].rgb
        venueCardTitle.innerHTML =
            '<span style="display:inline-block; width:15px; height:15px; background-color:' + visibleData[i].rgb + '; border-radius:50%; margin-right:5px;"></span>'
        venueCardTitle.innerHTML += visibleData[i].name;
        // venueCardTitle.innerHTML += '<a href="https://www.google.com/search?q=' + visibleData[i].name + '" target="_blank" style="margin-left:10px;"><i class="fas fa-external-link-alt"></i></a>';

        var venueCardText = document.createElement('p');
        venueCardText.className = 'card-text';

        venueCardBody.appendChild(venueCardTitle);
        venueCardBody.appendChild(venueCardText);
        venueCard.appendChild(venueCardBody);
        venueCardContainer.appendChild(venueCard);

        visibleData[i].marker.openPopup();
        // console.log(i);
    }
}


