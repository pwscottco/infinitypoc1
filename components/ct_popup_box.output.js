'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/*
*   --------------------------------------------------
*   CT Popup Box Web Component V1
*   --------------------------------------------------
*
*   Recoded for version 1 of the web components spec.
*
*   This will display a popup box that can be
*   populated with standard CTI controls. Can be used
*   as error messages, dialog boxes, overlays, etc.
*
*   --------------------------------------------------
*/

(function () {

    /**
     * CTPopupBox
     * @attribute {string} id
     * @container
     */
    var CTPopupBox = function (_HTMLElement) {
        _inherits(CTPopupBox, _HTMLElement);

        // Default Component methods

        function CTPopupBox(self) {
            var _this, _ret;

            _classCallCheck(this, CTPopupBox);

            self = (_this = _possibleConstructorReturn(this, (CTPopupBox.__proto__ || Object.getPrototypeOf(CTPopupBox)).call(this, self)), _this);
            self._rendered = false;
            return _ret = self, _possibleConstructorReturn(_this, _ret);
        }

        _createClass(CTPopupBox, [{
            key: 'connectedCallback',
            value: function connectedCallback() {
                //if(!this._rendered)
                this.initialRender();

                this._rendered = true;
            }

            // Custom Component Methods (for this component only)

        }, {
            key: 'initialRender',
            value: function initialRender() {
                console.log('Render');

                var container = document.createElement('div');
                container.className = 'popupBG';
                container.style.display = 'none';

                var popupBox = document.createElement('div');
                popupBox.className = 'popupBox';

                while (this.childNodes.length !== 0) {
                    popupBox.appendChild(this.childNodes[0]);
                }

                container.appendChild(popupBox);
                this.appendChild(container);
                this.opened = false;
                this.id = this.getAttribute("id");
            }

            /**
             * Toggles the menu opened and closed based on the value
             * of the this.opened property (initially set to false)
             * @param {string} containerid - id of container the popup is in
             */

        }, {
            key: 'toggle',
            value: function toggle(containerid) {

                var platform = cti.store.env.platform.name;

                if (!this.opened) {
                    this.opened = true;
                    this.querySelector('.popupBG').style.display = 'flex';
                    if (platform == 'ios') {
                        document.getElementById(containerid).classList.remove("scrollable-item-ios");
                    }
                } else {
                    this.opened = false;
                    this.querySelector('.popupBG').style.display = 'none';
                    if (platform == 'ios') {
                        document.getElementById(containerid).classList.remove("scrollable-item-ios");
                    }
                }
            }
        }]);

        return CTPopupBox;
    }(HTMLElement);

    // New V1 component definition


    customElements.define('ct-popup-box', CTPopupBox);
})();