#
# This file is part of amp-web.
#
# Copyright (C) 2013-2017 The University of Waikato, Hamilton, New Zealand.
#
# Authors: Shane Alcock
#          Brendon Jones
#
# All rights reserved.
#
# This code has been developed by the WAND Network Research Group at the
# University of Waikato. For further information please see
# http://www.wand.net.nz/
#
# amp-web is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License version 2 as
# published by the Free Software Foundation.
#
# amp-web is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with amp-web; if not, write to the Free Software Foundation, Inc.
# 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# Please report any bugs, questions or comments to contact@wand.net.nz
#

import abc

class CollectionGraph(object):
    __metaclass__ = abc.ABCMeta

    @abc.abstractmethod
    def format_data(self, data):
        return

    @abc.abstractmethod
    def get_collection_name(self):
        return

    @abc.abstractmethod
    def get_default_title(self):
        return

    @abc.abstractmethod
    def get_event_label(self, streamprops):
        return

    @abc.abstractmethod
    def get_required_scripts(self):
        return []

    def get_minimum_binsize(self, request):
        settings = request.registry.settings

        if self.minbin_option in settings:
            return int(settings[self.minbin_option])

        return None

    def get_event_graphstyle(self):
        return self.get_collection_name()

    def get_matrix_data_collection(self):
        return self.get_collection_name()

    def get_selection_options(self, ampy, selected, term, page):
        return ampy.get_selection_options(self.get_collection_name(), \
                selected, term, page)

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
