/*
 * Copyright 2019-2021 The Polypheny Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.polypheny.ui.test;


import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import lombok.extern.slf4j.Slf4j;


@SuppressWarnings({ "SqlDialectInspection", "SqlNoDataSourceInspection" })
@Slf4j
public class TestHelper {

    public static void main( String[] args ) {
        try {
            createSchema();
        } catch ( SQLException e ) {
            log.error( "Caught exception", e );
        }
    }


    public static void createSchema() throws SQLException {
        try ( JdbcConnection polyphenyDbConnection = new JdbcConnection( false ) ) {
            Connection connection = polyphenyDbConnection.getConnection();
            try ( Statement statement = connection.createStatement() ) {
                statement.executeUpdate( "DROP TABLE IF EXISTS \"test\"" );
                statement.executeUpdate( "CREATE TABLE \"test\"( \"id\" INTEGER NOT NULL, \"foo\" VARCHAR(20), PRIMARY KEY (\"id\") )" );
                statement.executeUpdate( "INSERT INTO \"test\" VALUES (1, 'polypheny')" );
                connection.commit();
            }
        }
    }


}

