import {Type} from '@angular/core';
import {MapLayerConfigurationComponent} from './visualization-configuration.interface';

export interface MapLayerConfiguration {
    configurationComponentType: Type<MapLayerConfigurationComponent>;

    copy(): MapLayerConfiguration;
}
