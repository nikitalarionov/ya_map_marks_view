/**
 * Author: Larionov Nikita (tolarionov@gmail.com)
 * CreateDate: 23.02.14 **/

$(function(){

    var np = window.np || {};
    var fullScreen = true;

    np.office = {
        Models: {},
        Collections: {},
        Views: {}
    };

    // Модель города
    np.office.Models.CityObject = Backbone.Model.extend({});

    // Модель оффиса
    np.office.Models.OfficeObject = Backbone.Model.extend({});

    // Коллекция оффисов

    np.office.Collections.Offices = Backbone.Collection.extend({});

    // Коллекция городов
    np.office.Collections.Cities = Backbone.Collection.extend({
        // Добавляем ссылку на модель города
        model: np.office.Models.CityObject
    });

    // Отображение блока списка городов
    np.office.Views.CityBlock = Backbone.View.extend({
        // Шаблон блока
        type: "CityBlock", // for debug
        tagName: "ul",
        // DOM элемент отображения
        el: ".map__city-block",
        template: _.template($('#City-List').html()),
        currentWord: null,
        initialize: function(options) {
            this.Marks = options.marks;
            this.currentWord = null;
            this.blocks = 0;
        },
        render: function() {
            // 3th argument this is important, to save events
            _.each(this.collection.models, this.processCityBlock, this);
            // It allows chaining. We don't need it now. But it is good practice.
            return this;
        },
        processCityBlock: function(city, key) {
            /* The child view is created and added to the parent view */
            var childCityView = new np.office.Views.City({model: city, mark: this.Marks[key]});
            // render it
            childCityView.render();
            /* Добавление первой обертки ul для первого города */
            if (this.blocks === 0) {
                this.currentWord = city.get('name')[0];
                this.blocks++;
                $('<ul></ul>').addClass('sortByA').append(childCityView.el).appendTo(this.$el);
            }
            /* Если буква города повторяется, то добавить в существующий ul по его индексу через query eq */
            if (this.currentWord === city.get('name')[0]) {
                var element = this.$el.find('.sortByA').eq(this.blocks-1);
                    element.append(childCityView.el).appendTo(this.$el);
                    this.currentWord = city.get('name')[0];
                }
                /* В случае если буква другая, увеличиваем кол блоков ul, и создаем новый ul - добавляя в него город */
                else {
                    this.blocks++;
                    $('<ul></ul>').addClass('sortByA').append(childCityView.el).appendTo(this.$el);
                    this.currentWord = city.get('name')[0];
                }
        }
    });

    // Отображение описания отдельного города
    np.office.Views.CityInfo = Backbone.View.extend({
        // set "el" to the container where the user will look detail information about city
        // Manage DOM
        el: ".office__description",
        template: _.template($('#CityDescription').html()),
        officesViews: [],
        initialize: function(options) {
            // if he event "city:selected" triggered, then call the method "citySelected"
            pubSub.events.on("city:selected", this.citySelected, this);
        },
        render: function() {
            this.model.set({city: this.model.get('name')});
            var outputHtml = this.template(this.model.toJSON());
            this.$el.html(outputHtml);
        },
        renderOffice: function(office) {
            var currentOffice = new np.office.Views.OfficeInfo({
                model: office,
                city: this.model
            });
            // Добавляем вид каждого офиса в свойства текущего вида
            this.officesViews.push(currentOffice);
            // Рендерим каждый офис и добавляем его в текущее описание города
            // Добавляет каждый офис
            currentOffice.render();
        },
        citySelected: function(city) {
            // Assign the city that passed in, to the model of the detail view
            // debug
            console.log(city.toJSON());
            this.model = city;
            this.render();
            // При выводе описания меняем ширину карты
            if(fullScreen) {
                fullScreen = false;
                $('.map__holder').css({width: '50%'});
                myMap.container.fitToViewport();
            }
            /* Если в описании есть офисы */
            if(city.get('office')) {
                /* Создать новую коллекцию оффисов */
                this.offices = new np.office.Collections.Offices(city.get('office'));
                // Рендерить каждый офис
                _.each(this.offices.models, this.renderOffice, this);
            }
        }
    });

    // Отображение описания отдельного офиса

    np.office.Views.OfficeInfo = Backbone.View.extend({
        el: ".office__description",
        template: _.template($('#OfficeDescription').html()),
        initialize: function(options) {
            this.city = options.city;
            /* Добавить поле в модель можно с помощью set */
            this.model.set({
                city: options.city.get('name')
            })
        },
        render: function(){
            var outPutHtml = this.template(this.model.toJSON());
            this.$el.append(outPutHtml);
        },
        officeSelected: function(office, city) {
            /* Тут можно реализовать клик по офису */
            console.log(office, city);
        }
    });

    // Отображение отдельного города в блоке списка городов
    np.office.Views.City = Backbone.View.extend({
        type: "CityView",
        tagName: 'li',
        className: "map__city-list_item",
        template: _.template($('#CityTemplate').html()),
        events: {
            'click' : "cityClicked"
        },
        initialize: function() {
            // Когда кликнули на карте
            pubSub.events.on("city:selected", this.toggle, this);
        },
        render: function() {
            // debug
            // console.log('City Rendered');
            var outputHtml = this.template(this.model.toJSON());
            this.$el.html(outputHtml);
        },
        toggle: function(city) {

            /* Если кликнули по нужному городу */
            if(city.toJSON().name == this.model.get('name')){
                this.$el.addClass('city-selected');
            }

            /* if not this city is clicked */
            if(city.toJSON().name !== this.model.get('name')) {
                this.$el.removeClass('city-selected');
            }

        },
        cityClicked: function() {
            console.log("cityClicked: " + this.model.get('name'));
            this.toggle(this.model);
            // trigger yandex map mark
            this.options.mark.events.fire('citySelect');
            // adding PubSub
            // send model to another view
            pubSub.events.trigger("city:selected", this.model);
        }
    });

    // Создаем PubSub для взаимодействия между View карты, списка городов и описания отдельного адресса

    var PubSub = function(){
        this.events = _.extend({}, Backbone.Events);
    };

    // Иницилизируем Publish Subscribe
    var pubSub = new PubSub();

    // Иницилизируем коллекцию Городов
    var CityCollection = new np.office.Collections.Cities([

        {
            name: "Москва",
            id: 0,
            contact_name: "Волков Александр Николаевич",
            nick: "volkov",
            phone: "+7 910 002-9733",
            pic: "img/face_01.jpg",
            description: "Муз. оборудование, фототехника, запчасти",
            address: "м. Царицыно, ТК Царицынский радиолюбитель, 1 эт., пав. 43",
            site: "",
            email: "89100029733@mail.ru",
            coordinates: [55.623402,37.668848],
            office:[{
                name: "Москва, 1-й Павловский пер., дом 3, офис 34",
                contact_name: "Ксенофонтов Александр Александрович",
                pic: "img/face_02.jpg",
                phone: "+7 901 5-1234-10",
                contacts: ['«Камри-клуб»'],
                description: "Авто-тюнинг, запчасти",
                address: 'Москва, 1-й Павловский пер., дом 3, офис 34',
                email: "test@gmail.com",
                site: "www.example.com",
                coordinates: [55.716894,37.628837],
                nick: "one-trd"
            }]

        },
        {
            name: "Санкт-Петербург",
            id: 1,
            contact_name: "Долгоаршинных Евгений Сергеевич",
            nick: "Slex",
            phone: "+7 904 3338369",
            pic: "img/face_03.jpg",
            description: "Аудио-видео, музыкальные инструменты, бытовая техника, спортивные товары, фотооборудование и прочие товары.",
            address: "Санкт-Петербург, пр. Большевиков 22, корп. 1",
            site: "",
            email: "slex@inbox.ru",
            coordinates: [59.902537,30.488344],
            office:[{
                name: "Санкт-Петербург, Шлиссельбургский пр., 12/1",
                contact_name: "Уманец Андрей Леонидович",
                pic: "img/face_04.jpg",
                phone: "+7 911 9138744",
                contacts: ['ICQ 54484652'],
                description: "Авто-тюнинг, cпорт и отых, любительская радиосвязь, компьютерная техника, авто и мотозапчасти и прочее",
                address: 'Шлиссельбургский пр., 12/1',
                email: "Andy-146@mail.ru",
                site: "www.example.com",
                coordinates: [59.840162, 30.495918],
                nick: "Andy-146"
            }]

        },

    ]);

    // Иницилизируем детальную информацию о городе

    var CityDescription = new np.office.Views.CityInfo();

    // Create new Map

    ymaps.ready(init);
    var myMap;

    // Инициализация API яндекс карт

    function init() {

        var addMarksFromCollection = function(Collection) {
            // Метки на карте
            var Marks = [];
            _.each(Collection.models, addOne);
            /* Функция по добавлению отметок на карту */
            function AddMark(city, content, coordinates, hintContent, ballonContent, notOffice, callback) {
                var CurrentMark = new ymaps.Placemark(coordinates, {
                    content: content,
                    balloonContent: ballonContent + "<br/><br/>" + content,
                    hintContent: hintContent
                },{
                    iconImageHref: 'img/marker.png',
                    iconImageSize: [26, 33], // размеры картинки
                    iconImageOffset: [0, 0]
                });
                // Подписываем событие на метку, внутри вызываем событие выбора города
                CurrentMark.events.add('balloonopen', function(e) {
                    pubSub.events.trigger("city:selected", city);

                    // Вызов callback при выборе города
                    if (typeof callback === 'function'){
                        callback();
                    }
                });
                // Подписываем карту на событие выбора города
                CurrentMark.events.add('citySelect', function(e) {
                    myMap.panTo(coordinates, 10, {flying: true, delay: 500, checkZoomRange: true, callback: setTimeout(function() {
                        // myMap.setCenter(City.coordinates, 9);
                    }, 2000)});

                });

                // Добавляем коллекцию подсказок в массив
                // Если
                if(notOffice) {
                    Marks.push(CurrentMark);
                }
                // Добавляем текущую подсказку в карту
                myMap.geoObjects.add(CurrentMark);
            }

            /* Функция по добавлению одной марки */
            function addOne(city) {
                var City = city.toJSON();
                /* if city have offices */
                if (City.office) {
                    /* Добавляет метку для каждого офиса */
                    _.each(City.office, function(office) {
                        AddMark(city, office.description, office.coordinates, office.name, office.name, false);
                    });
                    /* Добавляет метку офиса описанного в коллекции городов */
                    AddMark(city, City.description, City.coordinates, City.address, City.address, true);
                }
                else {
                    /* Добавляет метку офиса описанного в коллекции городов */
                    AddMark(city, City.description, City.coordinates, City.address, City.address, true);
                }
            }

            // Иницилизируем блок списка городов

            var CityBlock = new np.office.Views.CityBlock({
                collection: CityCollection,
                marks: Marks
            });
            CityBlock.render();
        };

        // Создаем карту
        myMap = new ymaps.Map ("map", {
            center: [55.76, 37.64],
            zoom: 2,
            autoFitToViewport: "always",
            behaviors: ["default"]
        });

        // Добавляем контролы для карты
        myMap.controls
            // Кнопка изменения масштаба.
            .add('zoomControl', { left: 5, top: 5 })
            // Список типов карты
            .add('typeSelector');

        // Задаем сортировку коллекции по имени, алфавитный порядок
        CityCollection.comparator = 'name';
        // Сортируем коллекцию
        CityCollection.sort();

        // Добавляем Метки из коллекции, функция внутри иницилизирует экземляр списка городов
        addMarksFromCollection(CityCollection);
    }
});