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

        closeForm = (form) => {
            form.classList.add('display-none');
            form.removeAttribute('data-id');
            form.removeAttribute('data-coords');
        },

        popupForm = (form, {left, top, user = '', place = '', feedback = '', coords, id = -1}) => {
            form.classList.remove('display-none');
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

/*
    function ClickBehavior() {
        this.options = new ymaps.option.Manager();
        this.events = new ymaps.event.Manager();
    }

    ClickBehavior.prototype = {
        constructor: ClickBehavior,
        enable: function () {
            this._parent.getMap().events.add('click', this._onClick, this);
        },
        disable: function () {
            this._parent.getMap().events.remove('click', this._onClick, this);
        },
        setParent: function (parent) {
            this._parent = parent;
        },
        getParent: function () {
            return this._parent;
        },
        _onClick: function (e) {
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
        }

    };
*/

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

    // ymaps.behavior.storage.add('clickbehavior', ClickBehavior); // eslint-disable-line no-undef
    // mapFeedback.behaviors.enable('clickbehavior');
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
            feedbacks.push([{
                user: inputUser.value,
                place: inputPlace.value,
                feedback: areaFeedback.value,
                timestamp: formatter.format(new Date())
            }]);

            let coords, newFeedback;
            const geoId = feedbacks.length - 1;

            coords = formFeedback.getAttribute('data-coords').split(',');
            newFeedback = new ymaps.Placemark(
                coords,
                getPointProperties(geoId, feedbacks[geoId]),
                getPointOptions()
            );

            clusterer.add(newFeedback);
        }
        e.preventDefault();
        closeForm(formFeedback);
    });

    document.addEventListener('click', e => {
        if (e.target.className === 'cluster-list') {
            const id = e.srcElement.getAttribute('data-id');
            console.log(id);
            console.log(e);
            console.log(mapFeedback.geoObjects);
            console.log(mapFeedback.geoObjects.get(id));
            console.log(mapFeedback.geoObjects.get(id).properties.get('geoId'));
            // let clickPointEvent = new IEventManager();
        }
    });
}