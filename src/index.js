import './styles/styles.css';

ymaps.ready(init);

function init() {
    const
        formFeedback = document.getElementById('form'),
        inputUser = document.querySelector('.feedback-user'),
        inputPlace = document.querySelector('.feedback-place'),
        areaFeedback = document.querySelector('.feedback-content'),
        btnCloseForm = document.querySelector('.header-closebtn'),
        btnAddFeedback = document.querySelector('.feedback-addlink'),
        labelAddress = document.querySelector('.header-text'),
        listFeedbacks = document.querySelector('ul.feedbacks-list'),

        renderFeedbacks = Handlebars.compile(document.querySelector('#feedbacks-list-template').innerHTML),

        feedbacks = [],
        coordsFeedbacks = [],

        closeForm = (form) => {
            form.classList.add('display-none');
            form.removeAttribute('data-id');
            form.removeAttribute('data-coords');
        },

        popupForm = (form, {left, top, user = '', place = '', feedback = '', coords, id = -1}) => {
            form.classList.remove('display-none');
            if (top + form.clientHeight > document.body.clientHeight) {
                top = top - ((top + form.clientHeight) - document.body.clientHeight);
            }
            if (left + form.clientWidth > document.body.clientWidth) {
                left = left - ((left + form.clientWidth) - document.body.clientWidth);
            }
            form.style.left = left + 'px';
            form.style.top = top + 'px';
            inputUser.value = user;
            inputPlace.value = place;
            areaFeedback.value = feedback;
            form.setAttribute('data-coords', coords);
            form.setAttribute('data-id', id);
            if (id != -1) {
                listFeedbacks.innerHTML = renderFeedbacks({
                    feedbacks: feedbacks[id]
                });
            } else {
                listFeedbacks.innerHTML = 'Отзывов пока нет...';
            }
        },

        mapFeedback = new ymaps.Map("mapFeedback", {
            center: [55.76, 37.64],
            zoom: 13,
            controls: ['zoomControl']
        }),

        getPointProperties = (id, props) => ({
            geoId: id,
            feedbacks: props,
            hasHint: false
        }),

        getPointOptions = () => ({
            preset: 'islands#violetIcon',
            openBalloonOnClick: false
        }),

        clusterBallonLayout = ymaps.templateLayoutFactory.createClass(`
            {% for point in properties.feedbacks %} 
            <h3>{{ point.user }}</h3>
            <div><a href="#" class="cluster-list" data-id="{{ properties.geoId }}"> {{ point.place }} </a></div>
            <div>{{ point.feedback }}</div>
            <br>
            {% endfor %}             
        `),

        clusterer = new ymaps.Clusterer({
            preset: 'islands#invertedVioletClusterIcons',
            groupByCoordinates: false,
            clusterDisableClickZoom: true,
            clusterHideIconOnBalloonOpen: false,
            geoObjectHideIconOnBalloonOpen: false,
            clusterBalloonContentLayout: 'cluster#balloonCarousel',
            clusterBalloonPagerSize: 5,
            clusterBalloonItemContentLayout: clusterBallonLayout,
            hasHint: false
        });

    mapFeedback.events.add('click', function (e) {
        const coords = e.get('coords');

        popupForm(formFeedback, {
            left: e.get('pagePixels')[0],
            top: e.get('pagePixels')[1],
            coords,
            id: -1
        });

        ymaps.geocode(coords)
            .then(function (res) {
                const firstGeoObject = res.geoObjects.get(0);

                labelAddress.innerHTML = firstGeoObject.getAddressLine();
            })
    });

    clusterer.events
        .add(['mouseenter', 'mouseleave', 'click'], e => {
            const target = e.get('target'),
                type = e.get('type'),
                coords = e.get('coords');

            if (typeof target.getGeoObjects !== 'undefined') {
                switch (type) {
                    case 'mouseenter':
                        target.options.set('preset', 'islands#invertedPinkClusterIcons');
                        break;
                    case 'mouseleave':
                        target.options.set('preset', 'islands#invertedVioletClusterIcons');
                        break;
                }
            } else {
                switch (type) {
                    case 'mouseenter':
                        target.options.set('preset', 'islands#pinkIcon');
                        break;
                    case 'mouseleave':
                        target.options.set('preset', 'islands#violetIcon');
                        break;
                    case 'click':
                        popupForm(formFeedback, {
                            left: e.get('pagePixels')[0],
                            top: e.get('pagePixels')[1],
                            coords,
                            id: target.properties.get('geoId')
                        });

                        ymaps.geocode(coords)
                            .then(function (res) {
                                const firstGeoObject = res.geoObjects.get(0);

                                labelAddress.innerHTML = firstGeoObject.getAddressLine();
                            })
                }
            }
        });

    mapFeedback.geoObjects.add(clusterer);

    mapFeedback.behaviors.disable(['rightMouseButtonMagnifier']);

    btnCloseForm.addEventListener('click', () => {
        closeForm(formFeedback);
    });

    btnAddFeedback.addEventListener('click', (e) => {
        const
            geoId = formFeedback.getAttribute('data-id'),

            formatter = new Intl.DateTimeFormat('ru', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false,
            });

        if (geoId != -1) {
            feedbacks[geoId].push({
                user: inputUser.value,
                place: inputPlace.value,
                feedback: areaFeedback.value,
                timestamp: formatter.format(new Date())
            });

        } else {
            let coords, newFeedback;

            coords = formFeedback.getAttribute('data-coords').split(',');

            feedbacks.push([{
                user: inputUser.value,
                place: inputPlace.value,
                feedback: areaFeedback.value,
                timestamp: formatter.format(new Date())
            }]);
            coordsFeedbacks.push(coords);

            const geoId = feedbacks.length - 1;

            newFeedback = new ymaps.Placemark(
                coords,
                getPointProperties(geoId, feedbacks[geoId]),
                getPointOptions()
            );

            clusterer.add(newFeedback);
        }
        console.log('coordsFeedbacks=', coordsFeedbacks);
        e.preventDefault();
        closeForm(formFeedback);
    });

    document.addEventListener('click', e => {
        if (e.target.className === 'cluster-list') {
            const id = e.srcElement.getAttribute('data-id');

            clusterer.balloon.close();
            popupForm(formFeedback, {
                left: e.clientX,
                top: e.clientY,
                coords: coordsFeedbacks[id].coords,
                id
            });
        }
    });
}