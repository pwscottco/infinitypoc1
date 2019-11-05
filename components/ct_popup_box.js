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

(function() {

    /**
     * CTPopupBox
     * @attribute {string} id
     * @container
     */
    class CTPopupBox extends HTMLElement {

        // Default Component methods

        constructor(self) {
            self = super(self);
            self._rendered = false;
            return self;
        }

        connectedCallback() {
            //if(!this._rendered)
                this.initialRender();

            this._rendered = true;
        }

        // Custom Component Methods (for this component only)

        initialRender() {
            console.log('Render');

            let container = document.createElement('div');
            container.className = 'popupBG';
            container.style.display = 'none';

            let popupBox = document.createElement('div');
            popupBox.className = 'popupBox';

            while(this.childNodes.length !== 0) {
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
        toggle(containerid) {
 
          let platform = cti.store.env.platform.name;
          
            if(!this.opened) {
                this.opened = true;
                this.querySelector('.popupBG').style.display = 'flex';
              	if(platform == 'ios'){
              		document.getElementById(containerid).classList.remove("scrollable-item-ios");
                }
            }
            else {
                this.opened = false;
                this.querySelector('.popupBG').style.display = 'none';
              	if(platform == 'ios'){
              		document.getElementById(containerid).classList.remove("scrollable-item-ios");
                }
            }
        }
    }

    // New V1 component definition
    customElements.define('ct-popup-box', CTPopupBox);

})();